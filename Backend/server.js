const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 5000;

// Включаем CORS для удобства
app.use(cors());

// Функция задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Основной запрос для получения лидов
app.get('/api/leads', async (req, res) => {
    try {
        const { status = "", opportunity = "", orderBy = "DATE_CREATE", orderDir = "desc" } = req.query;

        let allLeads = [];
        let start = 0; // Начальная страница
        const limit = 50; // Количество лидов на одну страницу
        const maxRetries = 5; // Максимальное количество попыток при ошибке
        const retryDelay = 5000; // Задержка перед повторной попыткой (в миллисекундах)

        // Фильтрация
        const filter = {};
        if (status) {
            filter["STATUS_ID"] = status; // Пример фильтрации по статусу
        }

        if (opportunity) {
            filter[">=OPPORTUNITY"] = opportunity; // Пример фильтрации по возможности
        }

        // Запрос на Битрикс24 API
        const requestData = {
            filter: filter,
            select: ["*"], // Выбираем все доступные поля
            start: start,
            order: {
                [orderBy]: orderDir,
            },
        };

        // Функция для выполнения запроса с повторными попытками
        const fetchLeads = async () => {
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    const response = await axios.post('https://ac-auto56.bitrix24.ru/rest/191/pwvrcdr5ix65tgej/crm.lead.list.json', requestData);

                    // Если получены данные, добавляем их в общий список
                    if (response.data.result) {
                        allLeads = allLeads.concat(response.data.result);
                    }

                    // Если ответ содержит меньше 50 записей, это последняя страница
                    if (response.data.result.length < limit) {
                        break;
                    }

                    // Увеличиваем стартовую позицию для следующей страницы
                    start += limit;
                    requestData.start = start;

                    // Если есть еще страницы, ждем перед следующим запросом
                    await delay(1000); // 1 секунда задержки между запросами
                } catch (error) {
                    if (error.response && error.response.status === 503) {
                        console.log(`Попытка ${attempt + 1} не удалась, задержка ${retryDelay / 1000} секунд...`);
                        await delay(retryDelay); // Задержка между попытками
                    } else {
                        console.error("Ошибка при запросе:", error.message);
                        throw error; // Выкидываем ошибку, если она не связана с 503
                    }
                }
            }
        };

        // Выполняем запрос
        await fetchLeads();

        // Отправляем результат
        res.json(allLeads);
    } catch (error) {
        console.error("Ошибка при запросе к API Битрикс:", error);
        res.status(500).json({ error: "Ошибка при получении данных от Битрикс", details: error.message });
    }
});

// Запускаем сервер
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
