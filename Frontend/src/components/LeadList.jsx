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
            const newLeads = response.data;
            updateLeads(newLeads);
            setLoading(false);
        } catch (err) {
            console.error('Ошибка при загрузке лидов:', err);
            setError('Не удалось загрузить лидов.');
            setLoading(false);
        }
    };

    // Обновление данных о лидах с добавлением новых и удалением старых
    const updateLeads = (newLeads) => {
        setLeads((prevLeads) => {
            const existingLeads = prevLeads.map((lead) => lead.ID);
            const newLeadIDs = newLeads.map((lead) => lead.ID);

            const addedLeads = newLeads.filter((lead) => !existingLeads.includes(lead.ID));
            const removedLeads = prevLeads.filter((lead) => !newLeadIDs.includes(lead.ID));

            return [
                ...prevLeads.filter((lead) => !removedLeads.includes(lead)),
                ...addedLeads,
            ];
        });
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

    if (loading) return <div className="loader"></div>;
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
                <div className="container-lead">
                    <div className="column-header">
                        Новые лиды <span>({newLeads.length})</span>
                    </div>


                    <div className="column">
                        {newLeads.map((lead) => {
                            const ageInHours = getLeadAge(lead.DATE_CREATE);

                            return (
                                <div key={lead.ID} className="card fade-in">
                                    <h3>{lead.TITLE}</h3>
                                    <p><strong>Имя:</strong> {lead.NAME}</p>
                                    <p><strong>Дата создания:</strong> {new Date(lead.DATE_CREATE).toLocaleString()}</p>
                                    <p><strong>Возраст лида:</strong> {Math.round(ageInHours)} часов</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="container-lead">

                    <div className="column-header">
                        Сгоревшие лиды <span>({redLeads.length})</span>
                    </div>

                    <div className="column">
                        {redLeads.map((lead) => {
                            const ageInHours = getLeadAge(lead.DATE_CREATE);
                            const gradientClass = getLeadGradient(ageInHours);

                            return (
                                <div key={lead.ID} className={`card ${gradientClass} fade-in`}>
                                    <h3>{lead.TITLE}</h3>
                                    <p><strong>Имя:</strong> {lead.NAME}</p>
                                    <p><strong>Дата создания:</strong> {new Date(lead.DATE_CREATE).toLocaleString()}</p>
                                    <p><strong>Возраст лида:</strong> {Math.round(ageInHours)} часов</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadList;
