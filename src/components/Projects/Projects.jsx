import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaGithub, FaExternalLinkAlt, FaMap, FaServer, FaEnvelope, FaGamepad, FaYoutube, FaCode, FaKeyboard, FaPalette, FaTimes, FaPlay, FaLaptopCode, FaBookOpen, FaRegImage, FaTelegramPlane, FaFish, FaExpand } from 'react-icons/fa'
import { FaCow } from 'react-icons/fa6'
import './Projects.css'
import RevealText from '../Effects/RevealText'

// Папка со скриншотами кейсов: public/cases/<slug>/ → /refteen/cases/<slug>/
const CASES_URL = '/refteen/cases/'

const projects = [
  {
    title: 'Derevnya Map',
    desc: 'Платформа для поиска и бронирования загородного жилья в Ставропольском крае. Карта с кластеризацией, маршруты, онлайн-бронирование, кабинеты гостя и владельца, подписка на тарифы.',
    tags: ['React', 'JavaScript', 'Tailwind CSS','NextJS', 'TypeScript', 'PostgreSQL'],
    live: 'https://derevnya-map.ru',
    github: 'https://github.com/refteen/DerevnyaMap',
    icon: <FaMap />,
    color: '#38bdf8',
    bg: 'linear-gradient(135deg, #0c2a3a 0%, #0a1628 100%)',
    app: null,
    preview: { type: 'slides', files: ['map.jpg', 'listing.jpg', 'booking.jpg', 'account.jpg'].map(f => '/refteen/cases/derevnyamap/' + f) },
    // Подробный кейс — открывается кнопкой «Смотреть кейс» на баннере
    caseStudy: {
      slug: 'derevnyamap',
      tagline: 'Платформа поиска и бронирования загородного жилья в Ставропольском крае',
      meta: [
        { k: 'Роль', v: 'Fullstack — от схемы БД до деплоя' },
        { k: 'Статус', v: 'В продакшене' },
        { k: 'Модель', v: 'Подписка для владельцев' },
        { k: 'Домен', v: 'derevnya-map.ru' },
      ],
      problem:
        'Гостевые дома, базы отдыха и отели Ставрополья живут в разрозненных объявлениях: соцсети, доски, сарафанное радио. ' +
        'У большинства владельцев нет своего сайта, а у туриста нет карты — непонятно, что где расположено, свободно ли и сколько стоит. ' +
        'Любое бронирование в итоге упирается в переписку в личных сообщениях.',
      solution: [
        {
          title: 'Карта с кластеризацией',
          desc: 'Объекты на Яндекс.Картах: при отдалении сходятся в кластеры, по клику на метку всплывает карточка с фото, типом жилья, рейтингом, удобствами и ценой — не уходя с карты.',
        },
        {
          title: 'Маршруты',
          desc: 'Отдельный раздел для планирования поездки по краю сразу по нескольким местам, а не по одному объекту за раз.',
        },
        {
          title: 'Страница объекта',
          desc: 'Полноэкранное фото, описание, список удобств, галерея, контакты владельца, отзывы с рейтингом, избранное и шаринг.',
        },
        {
          title: 'Бронирование с живым расчётом',
          desc: 'Даты заезда и выезда, число гостей, телефон и пожелания. Примерная стоимость пересчитывается на лету — до отправки заявки видно сумму.',
        },
        {
          title: 'Две роли на одном аккаунте',
          desc: 'Гость собирает избранное и пишет отзывы, владелец объекта управляет своими размещениями. Интерфейс кабинета зависит от роли.',
        },
        {
          title: 'Тарифы и подписка',
          desc: 'Монетизация вшита в продукт: тариф с месячной ценой, дата подключения, срок действия и остаток дней, смена тарифа прямо из кабинета.',
        },
        {
          title: 'Личный кабинет',
          desc: 'Мои объекты, избранное, мои отзывы, уведомления и настройки — пять разделов под одной навигацией.',
        },
        {
          title: 'Тёмная и светлая тема',
          desc: 'Переключатель в шапке: весь интерфейс, включая карту и карточки, продуман в двух палитрах.',
        },
        {
          title: 'Собственный REST API',
          desc: 'Бэкенд вынесен в отдельный сервис и репозиторий: авторизация, объекты, бронирования, загрузка изображений. Фронтенд и API развиваются независимо.',
        },
      ],
      challenges: [
        {
          title: 'Сотни меток без тормозов',
          desc: 'Если рисовать каждый объект отдельной меткой, карта захлёбывается уже на мелком масштабе. Кластеризация собирает соседние объекты в одну метку и раскрывает их по мере приближения.',
        },
        {
          title: 'Гость и владелец в одном аккаунте',
          desc: 'Не хотелось заставлять владельца заводить второй профиль. Роль хранится в пользователе, а кабинет собирается из разделов под неё — один логин, два разных интерфейса.',
        },
        {
          title: 'Фронт и API раздельно',
          desc: 'Бэкенд живёт в своём репозитории и деплоится отдельно: схема данных на Prisma, JWT-авторизация, CORS — фронтенд общается с ним только через REST.',
        },
      ],
      result:
        'Платформа работает в продакшене на derevnya-map.ru: туристы находят жильё на карте и бронируют без переписок, владельцы ведут объекты из кабинета, а монетизация заложена с первого дня через подписку.',
      stack: [
        { group: 'Frontend', items: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Яндекс.Карты API'] },
        { group: 'Backend', items: ['Node.js', 'TypeScript', 'REST API'] },
        { group: 'База данных', items: ['PostgreSQL'] },
      ],
      shots: [
        { file: 'map.jpg', caption: 'Карта мест: кластеры и карточка объекта прямо на карте' },
        { file: 'listing.jpg', caption: 'Страница объекта: фото, рейтинг, цена за сутки' },
        { file: 'booking.jpg', caption: 'Бронирование: даты, гости, живой расчёт стоимости' },
        { file: 'account.jpg', caption: 'Кабинет владельца: тариф, объекты, избранное, отзывы' },
      ],
      links: [
        { label: 'Открыть derevnya-map.ru', href: 'https://derevnya-map.ru', icon: <FaExternalLinkAlt />, primary: true },
        { label: 'Frontend', href: 'https://github.com/refteen/DerevnyaMap', icon: <FaGithub /> },
        { label: 'Backend', href: 'https://github.com/refteen/derevnyamap-backend', icon: <FaGithub /> },
      ],
    },
  },
  {
    title: 'Natura viva',
    desc: '3D-инсталляция в реальном времени: живой аквариум в тёмном музейном зале. Постучи по стеклу, выключи свет или фильтр, покорми рыб, слей воду — и посмотри, как ответит этот маленький мир.',
    tags: ['Three.js', 'WebGL', 'GLSL', 'Web Audio', 'JavaScript'],
    live: null,
    github: 'https://github.com/refteen/aquarium',
    icon: <FaFish />,
    color: '#5eead4',
    bg: 'linear-gradient(135deg, #03262a 0%, #020c10 100%)',
    app: '/refteen/apps/aquarium/index.html',
    // большое окно: полноценная 3D-сцена, а не мини-игра
    appWide: true,
    // обложка баннера; пока файла нет — обычный баннер с иконкой
    poster: '/refteen/cases/aquarium/poster.jpg',
    // живое превью при наведении на карточку
    preview: { type: 'video', src: '/refteen/cases/aquarium/preview.webm' },
    caseStudy: {
      slug: 'aquarium',
      tagline: 'Живой аквариум в браузере: 3D, свет и звук в реальном времени — без единого файла ассетов',
      meta: [
        { k: 'Роль', v: 'Автор — от идеи до шейдеров и звука' },
        { k: 'Формат', v: 'Интерактивная 3D-инсталляция' },
        { k: 'Ассеты', v: 'Ноль: всё генерируется кодом' },
        { k: 'Платформы', v: 'Браузер — десктоп и телефон' },
      ],
      problem:
        'Хотелось сделать не очередную демку шейдеров, а маленький мир, который живёт сам по себе и честно отвечает зрителю. ' +
        'Аквариум для этого идеален: вода, свет, растения и рыбы связаны между собой — потянешь за одну нить, и меняется всё остальное. ' +
        'Условие я поставил себе жёсткое: ни одного файла ассетов. Камни, трава, рыбы, текстуры и звук рождаются из кода прямо в браузере — и всё это должно работать даже на телефоне.',
      solution: [
        {
          title: 'Стая на boids',
          desc: '64 кардинала держат дистанцию, выравнивают курс и не отбиваются от своих. Стук по стеклу пугает ближайших, и страх волной прокатывается по всей стае. У трёх скалярий и пяти коридорасов — собственное поведение.',
        },
        {
          title: 'Вода и каустики на GPU',
          desc: 'Поверхность — симуляция волнового уравнения в шейдере: каждая капля и каждый пузырёк рисуют свои круги. Каустики на песке не нарисованы — они считаются из света, преломлённого этой самой поверхностью.',
        },
        {
          title: 'Свет и картинка',
          desc: 'Ивагуми из камней, ковёр травы и валлиснерия под лампой; лучи света в толще воды, HDR и bloom. Адаптивное разрешение подстраивает рендер под устройство, чтобы картинка оставалась плавной и на телефоне.',
        },
        {
          title: 'День и ночь',
          desc: 'Лампу можно выключить. Ночью кардиналы бледнеют и засыпают, как настоящие, а пузырьки кислорода «жемчужат» на траве только под светом.',
        },
        {
          title: 'Фильтр и экосистема',
          desc: 'Без фильтра поверхность становится зеркалом, течение замирает, вода медленно мутнеет и зеленеет, а рыбы поднимаются к поверхности — им не хватает кислорода.',
        },
        {
          title: 'Natura morta',
          desc: 'Если слить воду, время для рыб останавливается: они застывают в воздухе белыми фарфоровыми фигурками, как мобиль Колдера. Нальёшь снова — сверху обрушивается столб воды, и цвет возвращается к каждой рыбе, как только до неё поднимается вода.',
        },
        {
          title: 'Жители с именами',
          desc: 'Рыб можно покормить, а по клику — познакомиться. Скалярии и коридорасы носят имена Пегги Гуггенхайм и художников её круга: Пегги, Макс, Леонора — и Джексон, Марсель, Александр, Василий, Пит.',
        },
        {
          title: 'Звук без сэмплов',
          desc: 'Гул фильтра, бульканье, стук по стеклу, шум наливаемой воды — всё синтезируется через Web Audio в реальном времени, без единого аудиофайла.',
        },
      ],
      challenges: [
        {
          title: 'Ноль ассетов',
          desc: 'Без моделей и текстур всё — от формы камня до чешуи — пришлось описать процедурно: шум, SDF и параметры. Зато вся инсталляция весит как одна картинка.',
        },
        {
          title: 'Плавно и на телефоне',
          desc: 'Волны, каустики, объёмный свет и bloom дорого стоят. Рендер сам следит за временем кадра и снижает разрешение и число шагов, если устройство не вытягивает.',
        },
        {
          title: 'Звук, который слушается сцены',
          desc: 'Каждый звук синтезируется и зависит от состояния мира: уровень воды, мутность, день или ночь, где именно стукнули по стеклу. Лимитер и пул голосов не дают звуку развалиться, даже когда пузырьков сотни.',
        },
      ],
      result:
        'Законченная инсталляция, которая запускается прямо в браузере — на компьютере и на телефоне — и живёт своей жизнью, пока на неё смотрят. Её можно открыть здесь же, на сайте.',
      stack: [
        { group: 'Графика', items: ['Three.js', 'WebGL', 'GLSL-шейдеры'] },
        { group: 'Симуляция', items: ['Boids', 'Волновое уравнение на GPU', 'Каустики'] },
        { group: 'Рендер', items: ['HDR', 'Bloom', 'Адаптивное разрешение'] },
        { group: 'Звук', items: ['Web Audio API'] },
        { group: 'Язык', items: ['JavaScript'] },
      ],
      shots: [
        { file: 'viva.jpg', caption: 'Natura viva: день, ивагуми, стая кардиналов и каустики на песке' },
        { file: 'night.jpg', caption: 'Ночь: лампа погашена, кардиналы бледнеют и засыпают' },
        { file: 'murk.jpg', caption: 'Без фильтра: вода мутнеет и зеленеет, рыбы жмутся к поверхности' },
        { file: 'morta.jpg', caption: 'Natura morta: воды нет, рыбы застыли в воздухе фарфоровыми фигурками' },
      ],
      links: [
        // action: 'app' — не ссылка, а переключение модалки на саму инсталляцию
        { label: 'Запустить инсталляцию', action: 'app', icon: <FaPlay />, primary: true },
        { label: 'Открыть на весь экран', href: '/refteen/apps/aquarium/', icon: <FaExpand /> },
        { label: 'Исходный код', href: 'https://github.com/refteen/aquarium', icon: <FaGithub /> },
      ],
    },
  },
  {
    title: 'DerevnyaMap Backend',
    desc: 'REST API бэкенд платформы DerevnyaMap. Авторизация, управление объектами, бронирования, загрузка изображений.',
    tags: ['TypeScript', 'Node.js', 'PostgreSQL'],
    live: null,
    github: 'https://github.com/refteen/derevnyamap-backend',
    icon: <FaServer />,
    color: '#3178c6',
    bg: 'linear-gradient(135deg, #0a1a2e 0%, #080f1e 100%)',
    app: null,
    caseStudy: {
      slug: 'derevnyamap-backend',
      tagline: 'REST API платформы Derevnya Map: пользователи, объекты, отзывы, бронирования и избранное',
      meta: [
        { k: 'Роль', v: 'Проектирование и разработка API' },
        { k: 'Тип', v: 'REST-сервис' },
        { k: 'Данные', v: 'PostgreSQL через Prisma' },
        { k: 'Авторизация', v: 'JWT + bcrypt' },
      ],
      problem:
        'Фронтенду Derevnya Map нужен был отдельный сервис, который хранит объекты с координатами, отзывы, бронирования и избранное, ' +
        'различает гостя и владельца и не пускает к чужим данным. Хотелось, чтобы API можно было развивать и деплоить независимо от сайта.',
      solution: [
        { title: 'Авторизация', desc: 'Регистрация и вход с хешированием паролей через bcrypt, выдача JWT, эндпоинт /auth/me и middleware, которое защищает приватные маршруты.' },
        { title: 'Объекты', desc: 'Список, карточка и поиск мест с координатами, ценой, удобствами, кухней, расписанием и галереей. Добавлять объекты могут только авторизованные пользователи.' },
        { title: 'Отзывы', desc: 'Отзывы с рейтингом по объекту; удалить отзыв может только его автор.' },
        { title: 'Бронирования и избранное', desc: 'Заявки на даты заезда и выезда, список своих бронирований, добавление и удаление мест из избранного.' },
        { title: 'Схема данных', desc: 'Пять моделей в Prisma: User, Place, Review, Booking, Favorite — со связями и каскадным удалением, которые не оставляют «висячих» записей.' },
        { title: 'Healthcheck', desc: 'Отдельный эндпоинт /api/health для мониторинга и проверки деплоя.' },
      ],
      challenges: [
        { title: 'Целостность данных', desc: 'Удаление места должно забирать его отзывы и брони, а удаление пользователя — не ломать чужие отзывы. Решено правилами onDelete: Cascade и SetNull прямо в схеме.' },
        { title: 'Доступ к чужому', desc: 'Приватные маршруты берут пользователя из проверенного токена, а не из параметров запроса.' },
      ],
      result: 'API обслуживает фронтенд Derevnya Map: сайт и сервис развиваются независимо и общаются только через REST.',
      stack: [
        { group: 'Сервер', items: ['Node.js', 'Express', 'TypeScript'] },
        { group: 'Данные', items: ['PostgreSQL', 'Prisma ORM'] },
        { group: 'Безопасность', items: ['JWT', 'bcrypt', 'CORS'] },
      ],
      links: [
        { label: 'Исходный код', href: 'https://github.com/refteen/derevnyamap-backend', icon: <FaGithub />, primary: true },
        { label: 'Сам сайт', href: 'https://derevnya-map.ru', icon: <FaExternalLinkAlt /> },
      ],
    },
  },
  {
    title: 'AnimalFeedPlanner',
    desc: 'Десктопное Java-приложение для расчёта рационов сельхозживотных. Подбор кормов под потребности животного, график питательных веществ, сохранение рациона в JSON. Курсовой проект.',
    tags: ['Java', 'Maven', 'Swing', 'ООП'],
    live: null,
    github: 'https://github.com/refteen/AnimalFeedPlanner',
    icon: <FaCow />,
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, #2a1a05 0%, #140c02 100%)',
    app: null,
    caseStudy: {
      slug: 'animalfeedplanner',
      tagline: 'Десктопный калькулятор рационов для коров, свиней и кур — курсовой проект на Java',
      meta: [
        { k: 'Роль', v: 'Автор' },
        { k: 'Формат', v: 'Десктопное приложение' },
        { k: 'Контекст', v: 'Курсовой проект' },
        { k: 'Данные', v: 'JSON, без БД' },
      ],
      problem:
        'Рацион сельхозживотного считают вручную по таблицам: сколько белка и энергии нужно под цель — поддержать вес или набрать массу — и какими кормами это закрыть. ' +
        'Задача — сделать программу, которая подбирает соотношение кормов сама и наглядно показывает результат.',
      solution: [
        { title: 'Справочник кормов', desc: 'Таблица кормов с составом и питательностью, данные подгружаются из встроенного feeds.json.' },
        { title: 'Животное и цель', desc: 'Выбор животного и цели кормления — от них зависят потребности в белке и энергии.' },
        { title: 'Автоматический расчёт', desc: 'FeedCalculator подбирает соотношение кормов, а движок рекомендаций подсказывает, что изменить.' },
        { title: 'График питательных веществ', desc: 'Отдельная панель рисует распределение белка и энергии в итоговом рационе.' },
        { title: 'Сохранение', desc: 'Рацион сохраняется в ration.json и загружается обратно.' },
      ],
      challenges: [
        { title: 'Честное ООП', desc: 'Абстрактный Animal и наследники Cow, Pig, Chicken со своими потребностями: новое животное добавляется классом, без правок в расчёте.' },
        { title: 'Слои отдельно', desc: 'Модель, логика и интерфейс разнесены по пакетам model / logic / ui — Swing не знает, как считается рацион.' },
      ],
      result: 'Рабочее Swing-приложение, которое за пару кликов собирает рацион под животное и цель и показывает его на графике.',
      stack: [
        { group: 'Язык', items: ['Java 23'] },
        { group: 'Интерфейс', items: ['Swing'] },
        { group: 'Сборка и данные', items: ['Maven', 'JSON'] },
      ],
      links: [
        { label: 'Исходный код', href: 'https://github.com/refteen/AnimalFeedPlanner', icon: <FaGithub />, primary: true },
      ],
    },
  },
  {
    title: 'TG MTProto Proxy Parser',
    desc: 'Десктопный парсер MTProto-прокси из публичных Telegram-каналов. Проверяет каждый прокси настоящим MTProto-хендшейком, а не пингом: в список попадают только живые — с задержкой и страной. Подключение в Telegram одним кликом.',
    tags: ['Python', 'asyncio', 'tkinter', 'MTProto', 'PyInstaller'],
    live: null,
    github: 'https://github.com/refteen/telegram-mtproto-proxy-parser',
    icon: <FaTelegramPlane />,
    color: '#2aabee',
    bg: 'linear-gradient(135deg, #062b40 0%, #03131f 100%)',
    app: null,
    caseStudy: {
      slug: 'mtproto',
      tagline: 'Находит бесплатные MTProto-прокси и оставляет только те, что действительно работают',
      meta: [
        { k: 'Роль', v: 'Автор' },
        { k: 'Формат', v: 'Десктоп, Windows .exe' },
        { k: 'Сеть', v: 'asyncio, до 80 проверок разом' },
        { k: 'Сервер', v: 'Не нужен — всё локально' },
      ],
      problem:
        'В публичных каналах полно MTProto-прокси, но большинство давно мертвы. Обычные чекеры просто стучатся в порт — а открытый порт ещё не значит рабочий прокси. ' +
        'Хотелось одной кнопкой собрать свежие прокси, по-настоящему их проверить и сразу подключить лучший в Telegram.',
      solution: [
        { title: 'Парсинг без API', desc: 'Семь публичных каналов читаются через веб-превью t.me/s/<канал> — без ключей и авторизации. Ссылки достаются регулярками и дедуплицируются.' },
        { title: 'Настоящий хендшейк', desc: 'Для Basic и Secure — obfuscated2 с AES-CTR и запрос req_pq_multi до ответа resPQ от дата-центра Telegram. Для FakeTLS — ClientHello и криптографическая сверка HMAC в ответе.' },
        { title: 'Пинг и страна', desc: 'Пинг — время полного хендшейка, сортировка по нему из коробки. Страна определяется по IP пачками.' },
        { title: 'Подключение в один клик', desc: 'Открывает tg://proxy, Telegram сам предлагает применить прокси; без Desktop — уходит на t.me/proxy.' },
        { title: 'Удобства', desc: 'Свои ссылки пачкой, кэш между запусками, автообновление по таймеру, экспорт живых прокси и контекстное меню.' },
        { title: 'Сборка в .exe', desc: 'PyInstaller упаковывает всё в один файл — запуск двойным кликом, Python ставить не нужно.' },
      ],
      challenges: [
        { title: 'Отличить прокси от сайта', desc: 'FakeTLS-прокси маскируется под обычный HTTPS на 443 порту. Отличить его можно, только проверив HMAC в ответе сервера, — это доказывает, что на той стороне прокси, знающий секрет.' },
        { title: 'Сеть и интерфейс вместе', desc: 'Десятки одновременных асинхронных проверок не должны вешать окно tkinter: результаты попадают в таблицу по мере готовности.' },
      ],
      result: 'В список попадают только прокси, прошедшие реальную проверку протокола, отсортированные по пингу, — подключение к Telegram занимает один клик.',
      stack: [
        { group: 'Язык', items: ['Python 3.9+'] },
        { group: 'Сеть и крипто', items: ['asyncio', 'AES-CTR', 'HMAC-SHA256', 'MTProto'] },
        { group: 'Интерфейс', items: ['tkinter'] },
        { group: 'Сборка', items: ['PyInstaller'] },
      ],
      links: [
        { label: 'Исходный код и .exe', href: 'https://github.com/refteen/telegram-mtproto-proxy-parser', icon: <FaGithub />, primary: true },
      ],
    },
  },
  {
    title: 'Snake Game',
    desc: 'Аркадная змейка прямо в браузере. Управление стрелками/WASD, нарастающая скорость, сохранение рекорда в localStorage.',
    tags: ['HTML', 'CSS', 'JavaScript', 'Canvas'],
    live: null,
    github: 'https://github.com/refteen/snake-game',
    icon: <FaGamepad />,
    color: '#4ade80',
    bg: 'linear-gradient(135deg, #0a1e0e 0%, #060f08 100%)',
    app: '/refteen/apps/snake/index.html',
    // мини-версия самого приложения в режиме автопилота
    preview: { type: 'app', src: '/refteen/apps/snake/index.html?demo' },
    caseStudy: {
      slug: 'snake',
      tagline: 'Классическая змейка на Canvas — с нарастающей скоростью и автопилотом для превью',
      meta: [
        { k: 'Роль', v: 'Автор' },
        { k: 'Формат', v: 'Веб, один HTML-файл' },
        { k: 'Зависимости', v: 'Ноль' },
        { k: 'Демо', v: 'Запускается прямо здесь' },
      ],
      problem: 'Хотелось сделать знакомую игру аккуратно: без фреймворков, с приятной графикой и честной сложностью, которая растёт вместе со счётом.',
      solution: [
        { title: 'Игровой цикл', desc: 'Сетка 25×20, шаг по таймеру; каждые 5 очков игра ускоряется.' },
        { title: 'Управление', desc: 'Стрелки и WASD; разворот на 180° заблокирован, чтобы змейка не врезалась в себя одной клавишей.' },
        { title: 'Графика', desc: 'Тело переливается из фиолетового в голубой, еда светится радиальным градиентом.' },
        { title: 'Рекорд', desc: 'Лучший счёт хранится в localStorage и переживает перезагрузку.' },
      ],
      challenges: [
        { title: 'Автопилот для превью', desc: 'Для живой карточки в портфолио змейка играет сама: выбирает ход к еде и заранее считает, сколько свободного места останется после него, чтобы не заехать в тупик.' },
      ],
      result: 'Лёгкая игра в одном файле, которая запускается мгновенно — а в превью на карточке играет сама с собой.',
      stack: [
        { group: 'Отрисовка', items: ['HTML5 Canvas'] },
        { group: 'Логика', items: ['JavaScript'] },
        { group: 'Хранение', items: ['localStorage'] },
      ],
      links: [
        { label: 'Попробовать', action: 'app', icon: <FaPlay />, primary: true },
        { label: 'Исходный код', href: 'https://github.com/refteen/snake-game', icon: <FaGithub /> },
      ],
    },
  },
  {
    title: 'Memory Game',
    desc: 'Игра на память: переворачивай карточки с иконками технологий и находи пары. Счётчик ходов, таймер и ранг по результату.',
    tags: ['HTML', 'CSS', 'JavaScript'],
    live: null,
    github: 'https://github.com/refteen/memory-game',
    icon: <FaKeyboard />,
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, #1e1500 0%, #110c00 100%)',
    app: '/refteen/apps/typing/index.html',
    // мини-версия самого приложения в режиме автопилота
    preview: { type: 'app', src: '/refteen/apps/typing/index.html?demo' },
    caseStudy: {
      slug: 'memory',
      tagline: 'Игра на память с карточками технологий: ходы, таймер и ранг по итогу',
      meta: [
        { k: 'Роль', v: 'Автор' },
        { k: 'Формат', v: 'Веб, один HTML-файл' },
        { k: 'Зависимости', v: 'Ноль' },
        { k: 'Демо', v: 'Запускается прямо здесь' },
      ],
      problem: 'Простая механика «найди пару» — хороший повод поработать с CSS 3D-анимацией и состоянием игры без единой библиотеки.',
      solution: [
        { title: 'Поле 4×4', desc: 'Восемь пар карточек с иконками технологий перемешиваются при каждом запуске.' },
        { title: '3D-флип', desc: 'Переворот карточек на CSS 3D transforms.' },
        { title: 'Счёт', desc: 'Ходы, таймер с первого клика и ранг по результату — от «Продолжай» до «Легенды».' },
        { title: 'Экран победы', desc: 'Стеклянная панель на backdrop-filter с итогами и кнопкой новой игры.' },
      ],
      challenges: [
        { title: 'Блокировка поля', desc: 'Пока две несовпавшие карточки показываются, поле заблокировано — иначе быстрые клики ломают пары.' },
        { title: 'Автоигра для превью', desc: 'В режиме превью игра запоминает открытые карточки и сама собирает пары, как внимательный игрок.' },
      ],
      result: 'Аккуратная мини-игра без зависимостей, которая работает в любом браузере и сама себя демонстрирует на карточке.',
      stack: [
        { group: 'Анимация', items: ['CSS 3D transforms', 'backdrop-filter'] },
        { group: 'Логика', items: ['JavaScript'] },
      ],
      links: [
        { label: 'Попробовать', action: 'app', icon: <FaPlay />, primary: true },
        { label: 'Исходный код', href: 'https://github.com/refteen/memory-game', icon: <FaGithub /> },
      ],
    },
  },
  {
    title: 'CSS Gradient Generator',
    desc: 'Генератор CSS-градиентов с живым превью. Два/три цвета, угол, linear/radial, 6 пресетов, копирование CSS одной кнопкой.',
    tags: ['HTML', 'CSS', 'JavaScript'],
    live: null,
    github: 'https://github.com/refteen/css-gradient-generator',
    icon: <FaPalette />,
    color: '#c770f0',
    bg: 'linear-gradient(135deg, #1a0a24 0%, #0f0614 100%)',
    app: '/refteen/apps/gradient/index.html',
    // мини-версия самого приложения в режиме автопилота
    preview: { type: 'app', src: '/refteen/apps/gradient/index.html?demo' },
    caseStudy: {
      slug: 'gradient',
      tagline: 'Генератор CSS-градиентов: весь экран — живое превью',
      meta: [
        { k: 'Роль', v: 'Автор' },
        { k: 'Формат', v: 'Веб, один HTML-файл' },
        { k: 'Зависимости', v: 'Ноль' },
        { k: 'Демо', v: 'Запускается прямо здесь' },
      ],
      problem: 'Подбирать градиент в коде вслепую неудобно. Нужен инструмент, где результат виден сразу и на большой площади, а готовый CSS копируется одной кнопкой.',
      solution: [
        { title: 'Живое превью', desc: 'Градиент заливает весь фон и меняется в реальном времени.' },
        { title: 'Гибкая настройка', desc: 'Два или три цвета, linear или radial, угол от 0° до 360°.' },
        { title: 'Пресеты', desc: 'Шесть готовых сочетаний — отправная точка в один клик.' },
        { title: 'Копирование', desc: 'Готовая строка background копируется через Clipboard API.' },
      ],
      challenges: [
        { title: 'Читаемость на любом фоне', desc: 'Панель управления стеклянная, на backdrop-filter, — остаётся читаемой поверх любого градиента.' },
      ],
      result: 'Быстрый инструмент вместо ручного подбора градиентов: настроил, увидел, скопировал.',
      stack: [
        { group: 'Интерфейс', items: ['HTML', 'CSS', 'backdrop-filter'] },
        { group: 'Логика', items: ['JavaScript', 'Clipboard API'] },
      ],
      links: [
        { label: 'Попробовать', action: 'app', icon: <FaPlay />, primary: true },
        { label: 'Исходный код', href: 'https://github.com/refteen/css-gradient-generator', icon: <FaGithub /> },
      ],
    },
  },
  {
    title: 'AutoAccept Dota 2',
    desc: 'Python-скрипт, который автоматически принимает найденный матч в Dota 2.',
    tags: ['Python', 'Computer Vision'],
    live: null,
    github: 'https://github.com/refteen/AutoAccept-Dota2',
    icon: <FaCode />,
    color: '#c770f0',
    bg: 'linear-gradient(135deg, #1a0a24 0%, #0f0614 100%)',
    app: null,
  },
  {
    title: 'YouTube Downloader Bot',
    desc: 'Telegram-бот для скачивания YouTube-видео. Отправляешь ссылку — получаешь файл прямо в чате.',
    tags: ['Python', 'Telegram Bot API', 'yt-dlp'],
    live: null,
    github: 'https://github.com/refteen/TelegramBOT-YouTube-video-installer-',
    icon: <FaYoutube />,
    color: '#f05032',
    bg: 'linear-gradient(135deg, #1e0a06 0%, #120400 100%)',
    app: null,
  },
  {
    title: 'ООП на C#',
    desc: 'Лабораторные работы по объектно-ориентированному программированию на C#: наследование, интерфейсы, полиморфизм, обработка исключений и паттерны проектирования.',
    tags: ['C#', '.NET', 'ООП'],
    live: null,
    github: 'https://github.com/refteen/labs-object-oriented-programming',
    icon: <FaLaptopCode />,
    color: '#a179dc',
    bg: 'linear-gradient(135deg, #1a1030 0%, #0d0818 100%)',
    app: null,
  },
  {
    title: '1sec Email Telegram Bot',
    desc: 'Telegram-бот для генерации временных email-адресов. Получай и читай письма прямо в Telegram без регистрации.',
    tags: ['Python', 'Telegram Bot API'],
    live: null,
    github: 'https://github.com/refteen/1secEmail-Telegram-BOT',
    icon: <FaEnvelope />,
    color: '#ffd43b',
    bg: 'linear-gradient(135deg, #1e1a00 0%, #120f00 100%)',
    app: null,
  },
]

// Скриншот кейса. Пока файла нет — на его месте слот с подсказкой, куда его положить.
function Shot({ src, path, caption, color }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <figure className="case-shot case-shot--empty" style={{ '--sc': color }}>
        <div className="case-shot__ph">
          <FaRegImage />
          <p className="case-shot__ph-caption">{caption}</p>
          <code className="case-shot__ph-path">{path}</code>
        </div>
      </figure>
    )
  }

  return (
    <figure className="case-shot">
      <img src={src} alt={caption} loading="lazy" onError={() => setFailed(true)} />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

// Баннер карточки. Постер (если указан) проявляется поверх иконки, как только загрузится;
// нет файла или он не открылся — остаётся обычный баннер с иконкой.
function Banner({ project: p, onOpen, live }) {
  const [poster, setPoster] = useState('loading') // loading → ready | failed
  // короткая задержка: карточки, по которым курсор лишь пробежал, ничего не загружают
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!live || !p.preview) { setArmed(false); return }
    const id = setTimeout(() => setArmed(true), 140)
    return () => clearTimeout(id)
  }, [live, p.preview])

  return (
    <div
      className={poster === 'ready' ? 'project-card__banner project-card__banner--poster' : 'project-card__banner'}
      style={{ background: p.bg }}
    >
      <div className="project-card__banner-glow" style={{ background: p.color }} />
      <span className="project-card__banner-icon" style={{ color: p.color }}>{p.icon}</span>
      {p.poster && poster !== 'failed' && (
        <div className="project-card__poster">
          <img src={p.poster} alt="" loading="lazy" onLoad={() => setPoster('ready')} onError={() => setPoster('failed')} />
        </div>
      )}
      {armed && <LivePreview preview={p.preview} />}
      <div className="project-card__banner-dots">
        {[...Array(12)].map((_, j) => (
          <span key={j} className="banner-dot" style={{ opacity: 0.06 + (j % 3) * 0.06 }} />
        ))}
      </div>
      {(p.app || p.caseStudy) && (
        <div className="banner-actions">
          {p.app && (
            <button className="banner-play-btn" onClick={() => onOpen(p, 'app')} style={{ '--pc': p.color }}>
              <FaPlay /> Запустить
            </button>
          )}
          {p.caseStudy && (
            <button className="banner-play-btn" onClick={() => onOpen(p, 'case')} style={{ '--pc': p.color }}>
              <FaBookOpen /> Смотреть кейс
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Живое превью баннера: монтируется только пока на карточку наведён курсор,
// проявляется, когда готово, и снимается при уходе — в покое карточки ничего не грузят.
function LivePreview({ preview: pv }) {
  const [ready, setReady] = useState(false)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    if (pv.type !== 'slides') return
    setReady(true)
    const id = setInterval(() => setSlide(n => (n + 1) % pv.files.length), 1600)
    return () => clearInterval(id)
  }, [pv])

  return (
    <div className={ready ? 'live-preview live-preview--ready' : 'live-preview'} aria-hidden="true">
      {pv.type === 'video' && (
        <video src={pv.src} muted loop playsInline autoPlay onPlaying={() => setReady(true)} />
      )}
      {pv.type === 'app' && (
        // приложение рисуется втрое крупнее и ужимается — получается миниатюра настоящего окна
        <iframe src={pv.src} title="" tabIndex={-1} className="live-preview__app" onLoad={() => setTimeout(() => setReady(true), 250)} />
      )}
      {pv.type === 'slides' && pv.files.map((f, i) => (
        <img key={f} src={f} alt="" className={i === slide ? 'is-on' : ''} />
      ))}
      <span className="live-preview__badge"><i />live</span>
    </div>
  )
}

function CaseBody({ project, onLaunch }) {
  const c = project.caseStudy
  const color = project.color

  return (
    <div className="case">
      <header className="case__head">
        <h3 className="case__title">{project.title}</h3>
        <p className="case__tagline">{c.tagline}</p>

        <div className="case__links">
          {c.links.map(l => {
            const cls = l.primary ? 'case__link case__link--primary' : 'case__link'
            // action: 'app' — кнопка, которая переключает эту же модалку на приложение
            if (l.action === 'app') {
              return (
                <button key={l.label} type="button" className={cls} style={{ '--lc': color }} onClick={onLaunch}>
                  {l.icon} {l.label}
                </button>
              )
            }
            return (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={cls} style={{ '--lc': color }}>
                {l.icon} {l.label}
              </a>
            )
          })}
        </div>
      </header>

      <div className="case__meta">
        {c.meta.map(m => (
          <div key={m.k} className="case__meta-item">
            <span className="case__meta-k">{m.k}</span>
            <span className="case__meta-v">{m.v}</span>
          </div>
        ))}
      </div>

      <section className="case__block">
        <h4 className="case__h" style={{ '--hc': color }}>Задача</h4>
        <p className="case__text">{c.problem}</p>
      </section>

      <section className="case__block">
        <h4 className="case__h" style={{ '--hc': color }}>Что построил</h4>
        <div className="case__solution">
          {c.solution.map(s => (
            <div key={s.title} className="case__item">
              <span className="case__item-mark" style={{ background: color }} />
              <div>
                <p className="case__item-title">{s.title}</p>
                <p className="case__item-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {c.challenges && (
        <section className="case__block">
          <h4 className="case__h" style={{ '--hc': color }}>Что было сложно</h4>
          <div className="case__solution">
            {c.challenges.map(s => (
              <div key={s.title} className="case__item">
                <span className="case__item-mark case__item-mark--ring" style={{ borderColor: color }} />
                <div>
                  <p className="case__item-title">{s.title}</p>
                  <p className="case__item-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {c.result && (
        <section className="case__block">
          <h4 className="case__h" style={{ '--hc': color }}>Результат</h4>
          <p className="case__text case__result" style={{ '--hc': color }}>{c.result}</p>
        </section>
      )}

      <section className="case__block">
        <h4 className="case__h" style={{ '--hc': color }}>Стек</h4>
        <div className="case__stack">
          {c.stack.map(g => (
            <div key={g.group} className="case__stack-row">
              <span className="case__stack-group">{g.group}</span>
              <div className="case__stack-tags">
                {g.items.map(t => (
                  <span key={t} className="tag" style={{ '--tc': color }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {c.shots?.length > 0 && <section className="case__block">
        <h4 className="case__h" style={{ '--hc': color }}>Как это выглядит</h4>
        <div className="case__shots">
          {c.shots.map(s => (
            <Shot
              key={s.file}
              src={CASES_URL + c.slug + '/' + s.file}
              path={`public/cases/${c.slug}/${s.file}`}
              caption={s.caption}
              color={color}
            />
          ))}
        </div>
      </section>}
    </div>
  )
}

// Та же страница приложения без index.html — для отдельной вкладки на весь экран
const fullscreenUrl = p => p.app.replace(/index\.html$/, '')

export default function Projects() {
  // { project, mode: 'app' | 'case' } — какой проект открыт и что в окне: само приложение или кейс
  const [modal, setModal] = useState(null)
  const [hovered, setHovered] = useState(null)
  const isOpen = modal !== null

  const open = (project, mode) => setModal({ project, mode })
  const close = () => setModal(null)

  // Esc закрывает модалку, инерционный скролл страницы под ней замирает
  useEffect(() => {
    if (!isOpen) return
    const onEsc = e => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', onEsc)
    window.__lenis?.stop()
    return () => {
      window.removeEventListener('keydown', onEsc)
      window.__lenis?.start()
    }
  }, [isOpen])

  // Открыть проект из другого блока сайта — например, командой aquarium в терминале:
  // window.dispatchEvent(new CustomEvent('portfolio:open', { detail: { title, mode } }))
  useEffect(() => {
    const onOpen = e => {
      const { title, mode } = e.detail || {}
      const p = projects.find(x => x.title === title)
      if (!p) return
      // просили то, чего у проекта нет, — показываем то, что есть
      const m = (mode === 'case' && p.caseStudy) || !p.app ? 'case' : 'app'
      if (m === 'case' && !p.caseStudy) return

      let shown = false
      const show = () => {
        if (shown) return
        shown = true
        setModal({ project: p, mode: m })
      }

      // Сначала доезжаем до «Проектов», потом открываем окно: открытая модалка останавливает Lenis
      const lenis = window.__lenis
      if (lenis && !lenis.isStopped) {
        lenis.scrollTo('#projects', { onComplete: show })
        setTimeout(show, 1600) // прокрутку перебили колесом — окно всё равно откроется
      } else {
        document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })
        show()
      }
    }
    window.addEventListener('portfolio:open', onOpen)
    return () => window.removeEventListener('portfolio:open', onOpen)
  }, [])

  const handleTilt = e => {
    const card = e.currentTarget
    const inner = card.querySelector('.project-card__tilt')
    const glare = card.querySelector('.project-card__glare')
    const r = card.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    if (inner) inner.style.transform = `rotateX(${(0.5 - py) * 11}deg) rotateY(${(px - 0.5) * 11}deg)`
    if (glare) glare.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.16), transparent 46%)`
  }

  const resetTilt = e => {
    const inner = e.currentTarget.querySelector('.project-card__tilt')
    const glare = e.currentTarget.querySelector('.project-card__glare')
    if (inner) inner.style.transform = ''
    if (glare) glare.style.background = 'transparent'
  }

  const active = modal?.project
  const isCase = modal?.mode === 'case'
  // большое окно — только для самого приложения, кейс остаётся обычной ширины
  const wide = !isCase && active?.appWide
  const windowClass = isCase ? 'app-modal__window app-modal__window--case'
    : wide ? 'app-modal__window app-modal__window--wide'
    : 'app-modal__window'

  return (
    <section id="projects" className="projects">
      <div className="projects__blob blob" style={{ width: 400, height: 400, background: '#c770f0', bottom: 0, right: '-80px' }} />

      <div className="projects__inner">
        <RevealText text="Мои проекты" accent="проекты" />

        <div className="projects__grid">
          {projects.map((p, i) => (
            <motion.div
              key={p.title}
              className="project-card"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -6 }}
              onMouseMove={handleTilt}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={e => { resetTilt(e); setHovered(h => (h === i ? null : h)) }}
            >
              <div className="project-card__tilt">
                <span className="project-card__glare" />
                <Banner project={p} onOpen={open} live={hovered === i && !isOpen} />

              <div className="project-card__body">
                <div className="project-card__top">
                  <h3 className="project-card__title">{p.title}</h3>
                  <div className="project-card__links">
                    {p.github && (
                      <a href={p.github} target="_blank" rel="noreferrer" title="GitHub"><FaGithub /></a>
                    )}
                    {p.live && (
                      <a href={p.live} target="_blank" rel="noreferrer" title="Открыть сайт"><FaExternalLinkAlt /></a>
                    )}
                  </div>
                </div>
                <p className="project-card__desc">{p.desc}</p>
                <div className="project-card__tags">
                  {p.tags.map(t => (
                    <span key={t} className="tag" style={{ '--tc': p.color }}>{t}</span>
                  ))}
                </div>
              </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div
            className={wide ? 'app-modal app-modal--wide' : 'app-modal'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.div
              className={windowClass}
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="app-modal__bar" style={{ '--mc': active.color }}>
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
                <span className="app-modal__title">
                  {isCase ? `${active.title} — кейс` : active.title}
                </span>
                {isCase && active.app && (
                  <button className="app-modal__action" onClick={() => open(active, 'app')}>
                    <FaPlay /> Запустить
                  </button>
                )}
                {!isCase && active.caseStudy && (
                  <button className="app-modal__action app-modal__action--ghost" onClick={() => open(active, 'case')}>
                    <FaBookOpen /> Кейс
                  </button>
                )}
                {wide && (
                  // отдельная вкладка; окно здесь закрываем, чтобы сцена и звук не работали дважды
                  <a className="app-modal__full" href={fullscreenUrl(active)} target="_blank" rel="noreferrer" onClick={close}>
                    на весь экран ↗
                  </a>
                )}
                <button className="app-modal__close" onClick={close}>
                  <FaTimes />
                </button>
              </div>

              {isCase ? (
                // data-lenis-prevent — иначе остановленный Lenis глотает колесо мыши
                <div className="app-modal__scroll" data-lenis-prevent>
                  <CaseBody project={active} onLaunch={() => open(active, 'app')} />
                </div>
              ) : (
                // большим 3D-приложениям — полноэкранный режим и звук без лишних кликов
                <iframe
                  key={active.app}
                  src={active.app}
                  title={active.title}
                  className="app-modal__frame"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  allow={wide ? 'fullscreen; autoplay' : undefined}
                  allowFullScreen={wide}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
