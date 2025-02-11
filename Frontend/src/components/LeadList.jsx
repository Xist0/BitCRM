import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Lead.css';  // Подключаем файл стилей

// Функция для расчета времени между текущей датой и датой создания лида
const getLeadAge = (createdAt) => {
    const createdDate = new Date(createdAt);
    const currentDate = new Date();
    const diffInMilliseconds = currentDate - createdDate;
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60); // в часах
    return diffInHours;
};

// Функция для определения цвета фона в зависимости от возраста лида
const getLeadGradient = (ageInHours) => {
    if (ageInHours < 24) return 'green';  // Зеленый (менее 24 часов)
    if (ageInHours >= 24 && ageInHours < 38) return 'yellow'; // Желтый (от 24 до 38 часов)
    return 'red';  // Красный (больше 38 часов)
};

const LeadList = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Функция для получения данных лидов
    const fetchLeads = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:5000/api/leads`, {
                params: {
                    status: "",  // Можно добавить фильтрацию по статусу, если нужно
                },
            });
            setLeads(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Ошибка при загрузке лидов:', err);
            setError('Не удалось загрузить лидов.');
            setLoading(false);
        }
    };

    // Используем useEffect для загрузки данных при изменении status
    useEffect(() => {
        fetchLeads();
    }, []);

    // Автоматическое обновление списка каждые 60 секунд
    useEffect(() => {
        const interval = setInterval(() => {
            fetchLeads();
        }, 60000); // обновляем каждые 60 секунд

        return () => clearInterval(interval); // очистка интервала при размонтировании компонента
    }, []);

    if (loading) return <div>Загрузка...</div>;
    if (error) return <div>{error}</div>;

    // Фильтрация новых лидов (те, у которых статус "NEW")
    const newLeads = leads.filter(lead => lead.STATUS_ID === "NEW");

    // Сортировка новых лидов по дате создания (от самых новых)
    newLeads.sort((a, b) => new Date(b.DATE_CREATE) - new Date(a.DATE_CREATE));

    // Фильтрация красных лидов (те, которые старше 24 часов)
    const redLeads = leads.filter(lead => getLeadAge(lead.DATE_CREATE) > 24);

    // Сортировка красных лидов по убыванию возраста (от старых к новым)
    redLeads.sort((a, b) => getLeadAge(b.DATE_CREATE) - getLeadAge(a.DATE_CREATE));

    return (
        <div>
            <h1>Статистика по лидам</h1>

            <div className="lead-container">
                {/* Колонка с новыми лидами */}
                <div className="column">
                    <h2>Новые лиды</h2>
                    {newLeads.map((lead) => {
                        const ageInHours = getLeadAge(lead.DATE_CREATE);

                        return (
                            <div key={lead.ID} className="card">
                                <h3>{lead.TITLE}</h3>
                                <p><strong>Имя:</strong> {lead.NAME}</p>
                                <p><strong>Телефон:</strong> {lead.PHONE}</p>
                                <p><strong>Email:</strong> {lead.EMAIL}</p>
                                <p><strong>Дата создания:</strong> {new Date(lead.DATE_CREATE).toLocaleString()}</p>
                                <p><strong>Возраст лида:</strong> {Math.round(ageInHours)} часов</p>
                            </div>
                        );
                    })}
                </div>

                {/* Колонка с красными лидами (старше 24 часов) */}
                <div className="column">
                    <h2>Сгоревшие лиды</h2>
                    {redLeads.map((lead) => {
                        const ageInHours = getLeadAge(lead.DATE_CREATE);
                        const gradientClass = getLeadGradient(ageInHours);

                        return (
                            <div key={lead.ID} className={`card ${gradientClass}`}>
                                <h3>{lead.TITLE}</h3>
                                <p><strong>Имя:</strong> {lead.NAME}</p>
                                <p><strong>Телефон:</strong> {lead.PHONE}</p>
                                <p><strong>Email:</strong> {lead.EMAIL}</p>
                                <p><strong>Дата создания:</strong> {new Date(lead.DATE_CREATE).toLocaleString()}</p>
                                <p><strong>Возраст лида:</strong> {Math.round(ageInHours)} часов</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default LeadList;
