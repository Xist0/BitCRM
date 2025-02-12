const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 5000;

app.use(cors());

// Включаем кэш для данных
let cachedLeads = [];
let lastFetched = null;
const CACHE_EXPIRATION_TIME = 60 * 1000; // 1 минута

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Функция для получения данных с кэшированием
const fetchLeads = async (requestData) => {
    // Если данные кэша актуальны (не истекло время) - отдаем кэшированные данные
    const currentTime = Date.now();
    if (cachedLeads.length && (currentTime - lastFetched) < CACHE_EXPIRATION_TIME) {
        console.log('Возвращаем кэшированные данные');
        return cachedLeads;
    }

    let allLeads = [];
    let start = 0;
    const limit = 50;
    const maxRetries = 5;
    const retryDelay = 5000;

    const request = { ...requestData, start: 0, limit };  // Настройка запроса

    const fetchData = async () => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await axios.post('https://ac-auto56.bitrix24.ru/rest/191/pwvrcdr5ix65tgej/crm.lead.list.json', request);

                if (response.data.result) {
                    allLeads = allLeads.concat(response.data.result);
                }

                if (response.data.result.length < limit) break;

                start += limit;
                request.start = start;

                await delay(1000);
            } catch (error) {
                if (error.response && error.response.status === 503) {
                    console.log(`Попытка ${attempt + 1} не удалась, задержка ${retryDelay / 1000} секунд...`);
                    await delay(retryDelay);
                } else {
                    console.error('Ошибка при запросе:', error.message);
                    throw error;
                }
            }
        }
    };

    await fetchData();

    cachedLeads = allLeads;  // Обновляем кэш
    lastFetched = Date.now();  // Обновляем время последнего получения данных
    return allLeads;
};

app.get('/api/leads', async (req, res) => {
    try {
        const { status = "", opportunity = "", orderBy = "DATE_CREATE", orderDir = "desc" } = req.query;

        const filter = {};
        if (status) filter["STATUS_ID"] = status;
        if (opportunity) filter[">=OPPORTUNITY"] = opportunity;

        const requestData = {
            filter: filter,
            select: ["*"],
            order: {
                [orderBy]: orderDir,
            },
        };

        const allLeads = await fetchLeads(requestData);
        res.json(allLeads);
    } catch (error) {
        console.error("Ошибка при запросе к API Битрикс:", error);
        res.status(500).json({ error: "Ошибка при получении данных от Битрикс", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
