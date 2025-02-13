const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 5000;

app.use(cors());

// Кэш для лидов
let cachedLeads = [];
let lastFetched = null;
const CACHE_EXPIRATION_TIME = 60 * 1000; // 1 минута

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Статусы лидов, которые будем загружать
const ALLOWED_STATUSES = ["NEW", "UC_4XHMA1", "UC_4XHMA2", "UC_4XHMA3"]; 
// **NEW** - Не обработан  
// **UC_4XHMA1** - Пропущен  
// **UC_4XHMA2** - Перезвонить  
// **UC_4XHMA3** - Взят в работу  

// Функция для получения лидов
const fetchLeads = async () => {
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

    const request = {
        filter: { "STATUS_ID": ALLOWED_STATUSES }, // Фильтрация по нужным статусам
        select: ["ID", "TITLE", "NAME", "DATE_CREATE", "ASSIGNED_BY_ID", "STATUS_ID"], // Выбираем нужные поля
        order: { "DATE_CREATE": "desc" }, // Сортируем по дате создания (как в Битриксе)
        start: 0,
        limit
    };

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

    // Получаем список ответственных пользователей
    const userIds = [...new Set(allLeads.map(lead => lead.ASSIGNED_BY_ID).filter(id => id))];
    const users = await fetchUsers(userIds);

    // Добавляем имена ответственных в лиды
    allLeads = allLeads.map(lead => ({
        ...lead,
        ASSIGNED_BY_NAME: users[lead.ASSIGNED_BY_ID] || "Не назначен"
    }));

    cachedLeads = allLeads;  
    lastFetched = Date.now();  
    return allLeads;
};

// Функция для получения списка пользователей (ответственных)
const fetchUsers = async (userIds) => {
    if (userIds.length === 0) return {};

    try {
        const response = await axios.post('https://ac-auto56.bitrix24.ru/rest/191/slva3giogtzqh3fu/user.get.json', {
            filter: { "ID": userIds },
            select: ["ID", "NAME", "LAST_NAME"]
        });

        if (response.data.result) {
            return response.data.result.reduce((acc, user) => {
                acc[user.ID] = `${user.NAME} ${user.LAST_NAME}`;
                return acc;
            }, {});
        }
    } catch (error) {
        console.error('Ошибка при получении пользователей:', error.message);
        return {};
    }
};

// API endpoint для получения лидов
app.get('/api/leads', async (req, res) => {
    try {
        const allLeads = await fetchLeads();
        res.json(allLeads);
    } catch (error) {
        console.error("Ошибка при запросе к API Битрикс:", error);
        res.status(500).json({ error: "Ошибка при получении данных от Битрикс", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
