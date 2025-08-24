// Получаем все необходимые элементы
const cityForm = document.getElementById('city-search-form');
const cityInput = document.getElementById('city-input');
const cityNameElement = document.getElementById('city-name');
const weatherIconElement = document.getElementById('weather-icon');
const temperatureElement = document.getElementById('temperature');
const descriptionElement = document.getElementById('description');
const humidityElement = document.getElementById('humidity');
const windSpeedElement = document.getElementById('wind-speed');

const weatherInfoContainer = document.querySelector('.weather-info');
const cityCardsWrapper = document.getElementById('city-cards-wrapper');

// Координаты для карточек
const CITIES = [
    { name: 'Нью-Йорк', lat: 40.7128, lon: -74.0060 },
    { name: 'Токио', lat: 35.6895, lon: 139.6917 },
    { name: 'Париж', lat: 48.8566, lon: 2.3522 },
    { name: 'Сидней', lat: -33.8688, lon: 151.2093 }
];

// Координаты по умолчанию для основного блока (Лондон)
const DEFAULT_LAT = 51.5074;
const DEFAULT_LON = -0.1278;

// Начальная загрузка:
// 1. Показываем погоду для Лондона в основном блоке
getWeatherAndDisplay(DEFAULT_LAT, DEFAULT_LON, 'Лондон', 'main');
// 2. Загружаем данные для карточек
loadCityCards();

cityForm.addEventListener('submit', async (event) => {
    event.preventDefault(); 
    const city = cityInput.value;
    if (city) {
        // Скрываем основной блок на время загрузки
        weatherInfoContainer.style.opacity = '0';
        getCoordinatesAndWeather(city);
    }
});

async function getCoordinatesAndWeather(city) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${city}&format=json&limit=1`);
        const data = await response.json();
        
        if (data.length > 0) {
            const lat = data[0].lat;
            const lon = data[0].lon;
            const displayName = data[0].display_name.split(',')[0];
            getWeatherAndDisplay(lat, lon, displayName, 'main');
        } else {
            displayError('Город не найден', 'Проверьте название');
        }

    } catch (error) {
        displayError('Ошибка', 'Попробуйте позже');
    }
}

// Новая функция для загрузки карточек
async function loadCityCards() {
    for (const city of CITIES) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&hourly=relative_humidity_2m,windspeed_10m&timezone=auto`);
            const data = await response.json();

            if (data.current_weather) {
                createCityCard(city.name, data);
            }
        } catch (error) {
            console.error(`Ошибка при загрузке погоды для ${city.name}:`, error);
        }
    }
}

// Новая функция, которая создает HTML-карточку
function createCityCard(cityName, data) {
    const temp = data.current_weather.temperature;
    const weathercode = data.current_weather.weathercode;
    const weather = getWeatherInfo(weathercode);

    const card = document.createElement('div');
    card.className = 'city-card';
    card.innerHTML = `
        <h4 class="card-city">${cityName}</h4>
        <i class="fa-solid ${weather.iconClass} fa-2x"></i>
        <p class="card-temp">${Math.round(temp)} °C</p>
        <p class="card-desc">${weather.description}</p>
    `;

    // Добавляем обработчик, чтобы при клике на карточку её данные отображались в основном блоке
    card.addEventListener('click', () => {
        weatherInfoContainer.style.opacity = '0';
        getWeatherAndDisplay(data.latitude, data.longitude, cityName, 'main');
    });

    cityCardsWrapper.appendChild(card);
}



// Новый код для функции getWeatherAndDisplay
async function getWeatherAndDisplay(latitude, longitude, cityName, target) {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relative_humidity_2m,windspeed_10m&timezone=auto`);
        const data = await response.json();
        
        if (data.current_weather) {
            const temp = data.current_weather.temperature;
            const weathercode = data.current_weather.weathercode;
            const isDay = data.current_weather.is_day; // получаем, день сейчас или ночь
            
            // Находим текущий час, используя метод includes()
            const currentHourIndex = data.hourly.time.findIndex(time => time.includes(data.current_weather.time.slice(0, 13)));
            
            // Проверяем, что индекс найден
            let humidity = '--';
            let windSpeed = '--';
            if (currentHourIndex !== -1) {
                humidity = data.hourly.relative_humidity_2m[currentHourIndex];
                windSpeed = data.hourly.windspeed_10m[currentHourIndex];
            }
            
            const weather = getWeatherInfo(weathercode);
            
            // Обновляем HTML основного блока
            if (target === 'main') {
                cityNameElement.textContent = cityName;
                temperatureElement.textContent = `${Math.round(temp)} °C`;
                descriptionElement.textContent = weather.description;
                humidityElement.textContent = humidity;
                windSpeedElement.textContent = windSpeed;
                weatherIconElement.className = `fa-solid ${weather.iconClass} fa-3x`;
                weatherInfoContainer.style.opacity = '1';
                setBackground(isDay, weathercode);
            }

            

        } else {
            // Если нет данных о текущей погоде, выводим ошибку
            displayError('Погода недоступна', 'Проверьте название');
        }
    } catch (error) {
        console.error('Ошибка получения данных о погоде:', error);
        displayError('Ошибка', 'Попробуйте позже');
    }
}

function displayError(city, desc) {
    weatherInfoContainer.style.opacity = '0';
    setTimeout(() => {
        cityNameElement.textContent = city;
        temperatureElement.textContent = '-- °C';
        descriptionElement.textContent = desc;
        humidityElement.textContent = '--';
        windSpeedElement.textContent = '--';
        weatherIconElement.className = '';
        weatherInfoContainer.style.opacity = '1';
    }, 300);
}

function getWeatherInfo(code) {
    const weatherData = {
        0: { description: 'Ясно', iconClass: 'fa-sun' },
        1: { description: 'В основном ясно', iconClass: 'fa-cloud-sun' },
        2: { description: 'Частично облачно', iconClass: 'fa-cloud-sun' },
        3: { description: 'Пасмурно', iconClass: 'fa-cloud' },
        45: { description: 'Туман', iconClass: 'fa-smog' },
        48: { description: 'Изморозь', iconClass: 'fa-smog' },
        51: { description: 'Моросящий дождь', iconClass: 'fa-cloud-showers-heavy' },
        53: { description: 'Моросящий дождь', iconClass: 'fa-cloud-showers-heavy' },
        55: { description: 'Сильный моросящий дождь', iconClass: 'fa-cloud-showers-heavy' },
        56: { description: 'Ледяной дождь', iconClass: 'fa-cloud-showers-heavy' },
        57: { description: 'Сильный ледяной дождь', iconClass: 'fa-cloud-showers-heavy' },
        61: { description: 'Слабый дождь', iconClass: 'fa-cloud-sun-rain' },
        63: { description: 'Умеренный дождь', iconClass: 'fa-cloud-rain' },
        65: { description: 'Сильный дождь', iconClass: 'fa-cloud-showers-heavy' },
        66: { description: 'Ледяной дождь', iconClass: 'fa-cloud-rain' },
        67: { description: 'Сильный ледяной дождь', iconClass: 'fa-cloud-showers-heavy' },
        71: { description: 'Слабый снег', iconClass: 'fa-cloud-snow' },
        73: { description: 'Умеренный снег', iconClass: 'fa-cloud-snow' },
        75: { description: 'Сильный снег', iconClass: 'fa-snowflake' },
        77: { description: 'Снежная крупа', iconClass: 'fa-snowflake' },
        80: { description: 'Слабый ливень', iconClass: 'fa-cloud-sun-rain' },
        81: { description: 'Умеренный ливень', iconClass: 'fa-cloud-showers-heavy' },
        82: { description: 'Сильный ливень', iconClass: 'fa-cloud-showers-heavy' },
        85: { description: 'Слабый снегопад', iconClass: 'fa-cloud-snow' },
        86: { description: 'Сильный снегопад', iconClass: 'fa-snowflake' },
        95: { description: 'Гроза', iconClass: 'fa-cloud-bolt' },
        96: { description: 'Гроза', iconClass: 'fa-cloud-bolt' },
        99: { description: 'Гроза', iconClass: 'fa-cloud-bolt' },
    };
    return weatherData[code] || { description: 'Неизвестно', iconClass: 'fa-question-circle' };
}

function setBackground(isDay, weathercode) {
    let newBackground;
    
    // Логика для выбора фона
    if (isDay === 0) {
        // Ночь
        if (weathercode <= 3) {
            newBackground = 'linear-gradient(135deg, #1e3a8a, #0c1c4b)';
        } else if (weathercode >= 45 && weathercode <= 67) {
            newBackground = 'linear-gradient(135deg, #2c3e50, #0d1a24)';
        } else if (weathercode >= 71) {
            newBackground = 'linear-gradient(135deg, #4b5a6c, #2c3e50)';
        } else {
            newBackground = 'linear-gradient(135deg, #1e3a8a, #3b82f6)';
        }
    } else {
        // День
        if (weathercode <= 1) {
            newBackground = 'linear-gradient(135deg, #4e7ac7, #84a6e3)';
        } else if (weathercode <= 3) {
            newBackground = 'linear-gradient(135deg, #6c8ca3, #a1c2d8)';
        } else if (weathercode >= 45 && weathercode <= 67) {
            newBackground = 'linear-gradient(135deg, #5c6c7d, #8d9da9)';
        } else if (weathercode >= 71) {
            newBackground = 'linear-gradient(135deg, #b0c4de, #dbe9f7)';
        } else {
            newBackground = 'linear-gradient(135deg, #1e3a8a, #3b82f6)';
        }
    }

    document.body.style.background = newBackground;
    document.body.style.transition = 'background 1s ease-in-out';
}