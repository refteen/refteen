# 👋 refteen — портфолио

Персональный сайт-портфолио Full Stack разработчика **Вячеслава Погуляйченко**. Не просто визитка, а интерактивный опыт: живой терминал, мини-приложения прямо на странице, кастомный курсор и живая статистика GitHub.

🔗 **Живая версия:** [refteen.github.io/refteen](https://refteen.github.io/refteen/)

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-0055FF?style=flat&logo=framer&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub_Pages-222?style=flat&logo=github&logoColor=white)

## ✨ Фишки

- **🖥️ Живой терминал** — вводи команды (`help`, `about`, `projects`, `hire`, `github`, `neofetch`) с автодополнением по Tab, историей команд и звуком печати.
  - `matrix` — цифровой дождь прямо в окне терминала
  - `theme` — смена акцентного цвета всего сайта на лету
  - `github` — живая статистика профиля через GitHub API
- **🎮 Мини-приложения** — Snake, Memory Game и генератор градиентов запускаются во встроенном окне, без ухода с сайта.
- **🪄 Кастомный курсор** — кружок с магнитным притяжением к кнопкам и фоновым свечением-шлейфом.
- **🎬 Прелоадер** — анимированный экран загрузки при входе.
- **📊 Анимированные счётчики** и плавные reveal-анимации на скролле.
- **🎴 3D-наклон карточек** проектов со световым бликом.
- **🎧 Плавающий плеер** с любимым треком.

## 🛠️ Стек

| Технология | Назначение |
|---|---|
| React 18 + Vite 5 | Основа и сборка |
| Framer Motion | Анимации и переходы |
| React Icons | Иконки |
| react-scroll | Плавная навигация по секциям |
| tsParticles | Частицы в hero-секции |
| Web Audio API | Звук печати в терминале |
| GitHub API | Живая статистика профиля |

## 🚀 Локальный запуск

```bash
git clone https://github.com/refteen/refteen.git
cd refteen
npm install
npm run dev
```

Сборка продакшена и деплой на GitHub Pages:

```bash
npm run build     # сборка в dist/
npm run deploy     # публикация в ветку gh-pages
```

## 📁 Структура

```
src/
├── components/
│   ├── Navbar/        навигация
│   ├── Home/          hero + код-карточка с typewriter
│   ├── About/         обо мне
│   ├── Stats/         анимированные счётчики
│   ├── Skills/        стек технологий
│   ├── Projects/      проекты + встроенные мини-приложения
│   ├── Terminal/      интерактивный терминал
│   ├── Contact/       контакты
│   ├── Footer/        подвал
│   ├── MusicPlayer/   плавающий плеер
│   ├── Preloader/     экран загрузки
│   └── Effects/       кастомный курсор, прогресс скролла
├── hooks/             useTypewriter
└── App.jsx
```

## 📫 Контакты

- Telegram: [@ewiwt](https://t.me/ewiwt)
- ВКонтакте: [vk.ru/refteenyt](https://vk.ru/refteenyt)
- GitHub: [github.com/refteen](https://github.com/refteen)

---

⭐ Если понравилось — поставь звезду!
