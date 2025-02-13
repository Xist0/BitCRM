import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './Lead.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_NAMES = {
    "NEW": "Не обработан",
    "UC_4XHMA1": "Пропущен",
    "UC_4XHMA2": "Перезвонить",
    "UC_4XHMA3": "Взят в работу"
};

// Функция для вычисления возраста лида в часах и минутах
const formatLeadAge = (createdAt) => {
    const now = new Date();
    const createdDate = new Date(createdAt);
    const diffMs = now - createdDate;
    const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));

    let ageString = '';

    if (hours > 0) {
        ageString += `${hours} ${getHourLabel(hours)}`;
    }

    if (minutes > 0) {
        ageString += ` ${minutes} ${getMinuteLabel(minutes)}`;
    }

    return ageString.trim();
};

// Функция для получения правильного окончания слова "час"
const getHourLabel = (hours) => {
    if (hours % 10 === 1 && hours % 100 !== 11) return "час";
    if ([2, 3, 4].includes(hours % 10) && ![12, 13, 14].includes(hours % 100)) return "часа";
    return "часов";
};

// Функция для получения правильного окончания слова "минута"
const getMinuteLabel = (minutes) => {
    if (minutes % 10 === 1 && minutes % 100 !== 11) return "минута";
    if ([2, 3, 4].includes(minutes % 10) && ![12, 13, 14].includes(minutes % 100)) return "минуты";
    return "минут";
};

// Определение класса цвета по возрасту лида
const getLeadGradient = (createdAt) => {
    const hours = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60));
    if (hours < 24) return 'green';
    if (hours < 38) return 'yellow';
    return 'red';
};

// Функция для генерации случайного цвета
const generateColor = () => {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
};



const LeadList = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [assignedStats, setAssignedStats] = useState({});
    const [chartData, setChartData] = useState(null);
    const [colorMap, setColorMap] = useState({});

    // Сортировка ответственных по количеству лидов
    const sortedAssignedStats = Object.entries(assignedStats)
        .sort(([, countA], [, countB]) => countB - countA); // Сортировка по убыванию

    // Функция для загрузки лидов
    const fetchLeads = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/leads`);
            const newLeads = response.data;
            setLeads(newLeads);

            // Подсчет лидов по ответственным
            const stats = {};
            newLeads.forEach(lead => {
                if (lead.ASSIGNED_BY_NAME) {
                    stats[lead.ASSIGNED_BY_NAME] = (stats[lead.ASSIGNED_BY_NAME] || 0) + 1;
                }
            });

            setAssignedStats(stats);

            // Генерация уникальных цветов для ответственных
            const newColorMap = { ...colorMap };
            Object.keys(stats).forEach(name => {
                if (!newColorMap[name]) {
                    newColorMap[name] = generateColor();
                }
            });
            setColorMap(newColorMap);

            // Обновление данных для диаграммы
            setChartData({
                labels: Object.keys(stats),
                datasets: [{
                    data: Object.values(stats),
                    backgroundColor: Object.keys(stats).map(name => newColorMap[name]),
                    hoverOffset: 4
                }]
            });

            setLoading(false);
        } catch (err) {
            setError('Ошибка при загрузке данных');
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
        const interval = setInterval(fetchLeads, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Применяем сортировку после загрузки новых данных
        if (assignedStats) {
            setAssignedStats((prevStats) => {
                const sortedStats = Object.entries(prevStats)
                    .sort(([, countA], [, countB]) => countB - countA);
                return Object.fromEntries(sortedStats);
            });
        }
    }, [assignedStats]);  // Срабатывает при изменении assignedStats

    if (loading) return <div className="loader"></div>;
    if (error) return <div className="error-message">{error}</div>;

    const newLeads = leads
        .filter(lead => lead.STATUS_ID === "NEW")
        .sort((a, b) => new Date(b.DATE_CREATE) - new Date(a.DATE_CREATE));

    const redLeads = leads
        .filter(lead => (new Date() - new Date(lead.DATE_CREATE)) > 24 * 60 * 60 * 1000) // Лиды старше 24 часов
        .sort((a, b) => (new Date(a.DATE_CREATE) - new Date(b.DATE_CREATE))); // Сортировка по убыванию возраста

    return (
        <div>
            <h1>Статистика по лидам</h1>
            <div className="chart-block">
                {chartData && (
                    <div className="chart-container">
                        <h2>Распределение лидов</h2>
                        <Pie data={chartData} options={{ plugins: { legend: { display: false } } }} />
                    </div>
                )}

                <div className="assigned-list">
                    {sortedAssignedStats.map(([name, count]) => (
                        <div key={name} className="assigned-item">
                            <span className="color-box" style={{ backgroundColor: colorMap[name] }}></span>
                            <span className="assigned-name">{name}</span>
                            <span className="lead-count">({count})</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="lead-container">
                <div className="container-lead">
                    <div className="column-header">Новые лиды <span>({newLeads.length})</span></div>
                    <div className="column">
                        {newLeads.map(lead => (
                            <div key={lead.ID} className="card fade-in">
                                <h3>{lead.TITLE}</h3>
                                <p><strong>Имя:</strong> {lead.NAME}</p>
                                <p><strong>Ответственный:</strong> {lead.ASSIGNED_BY_NAME}</p>
                                <p><strong>Статус:</strong> {STATUS_NAMES[lead.STATUS_ID] || "Неизвестный статус"}</p>
                                <p><strong>Дата создания:</strong> {new Date(lead.DATE_CREATE).toLocaleString()}</p>
                                <p><strong>Возраст:</strong> {formatLeadAge(lead.DATE_CREATE)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="container-lead">
                    <div className="column-header">Сгоревшие лиды <span>({redLeads.length})</span></div>
                    <div className="column">
                        {redLeads.map(lead => (
                            <div key={lead.ID} className={`card ${getLeadGradient(lead.DATE_CREATE)} fade-in`}>
                                <h3>{lead.TITLE}</h3>
                                <p><strong>Имя:</strong> {lead.NAME}</p>
                                <p><strong>Ответственный:</strong> {lead.ASSIGNED_BY_NAME}</p>
                                <p><strong>Статус:</strong> {STATUS_NAMES[lead.STATUS_ID] || "Неизвестный статус"}</p>
                                <p><strong>Дата создания:</strong> {new Date(lead.DATE_CREATE).toLocaleString()}</p>
                                <p><strong>Возраст:</strong> {formatLeadAge(lead.DATE_CREATE)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadList;

