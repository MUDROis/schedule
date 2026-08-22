// ============================================================
//  Firebase — вставьте сюда ключи ВАШЕГО проекта
//  Консоль Firebase → ⚙ Project settings → General → Your apps
//  → Web app → SDK setup and configuration → Config
// ============================================================
window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyAJ98KQLeZFJu2bM25Ka-yWIRMQjFDMtk8",
    authDomain: "schedule-c454d.firebaseapp.com",
    projectId: "schedule-c454d",
    storageBucket: "schedule-c454d.firebasestorage.app",
    messagingSenderId: "420931131519",
    appId: "1:420931131519:web:fb6633c82d54f2722c874a"
};

// ============================================================
//  Аккаунты пользователей.
//  Создайте их в Firebase Console → Authentication → Sign-in
//  method → Email/Password → Add user, и впишите email сюда
//  ТОЧНО как в Firebase:
// ============================================================
window.ROLE_EMAILS = {
    anna: "mudro.is@yandex.ru",   // Анна Александровна — админ (видит оба расписания)
    tanya: "english.i.s@yandex.ru"   // Татьяна Александровна — преподаватель (только своё)
};
