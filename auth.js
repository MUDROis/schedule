// ============================================================
//  Общий модуль авторизации (Firebase Auth + Firestore).
//  Перед этим файлом на странице должны быть подключены
//  firebase-*-compat.js и firebase-config.js, а также задан
//  window.__PAGE__ = { kind: 'app'|'login', owner: 'anna'|'tanya' }
// ============================================================
(function () {
    'use strict';

    var cfg = window.FIREBASE_CONFIG || {};
    var emails = window.ROLE_EMAILS || {};
    var page = window.__PAGE__ || { kind: 'app', owner: 'anna' };
    var HOME = { anna: 'index.html', tanya: 'teacher.html' };

    function showFatal(message) {
        var gate = document.getElementById('authGate');
        if (!gate) { alert(message); return; }
        gate.classList.add('error');
        gate.innerHTML =
            '<div class="gate-card">' +
            '<div class="gate-icon">🔒</div>' +
            '<h2>Нет доступа</h2>' +
            '<p>' + message + '</p>' +
            '</div>';
    }

    if (!cfg.apiKey || !cfg.projectId || /^ВАШ/.test(cfg.apiKey)) {
        document.addEventListener('DOMContentLoaded', function () {
            showFatal('Приложение не настроено: заполните файл <b>firebase-config.js</b> ключами вашего проекта Firebase.');
        });
        return;
    }

    firebase.initializeApp(cfg);

    var db = firebase.firestore();
    db.enablePersistence({ synchronizeTabs: true }).catch(function () {});

    var auth = firebase.auth();
    auth.useDeviceLanguage();

    function roleOf(user) {
        if (!user || !user.email) return null;
        var email = String(user.email).toLowerCase();
        if (emails.anna && email === String(emails.anna).toLowerCase()) return 'anna';
        if (emails.tanya && email === String(emails.tanya).toLowerCase()) return 'tanya';
        return null;
    }

    var resolveReady;
    var ready = new Promise(function (resolve) { resolveReady = resolve; });

    auth.onAuthStateChanged(function (user) {

        // Страница входа: уже вошедших сразу отправляем на их страницу
        if (page.kind === 'login') {
            if (!user) return;
            var r0 = roleOf(user);
            if (r0) {
                location.replace(HOME[r0]);
            } else {
                auth.signOut().then(function () {
                    if (window.MudroLogin) window.MudroLogin.showError('Этот аккаунт не имеет доступа.');
                });
            }
            return;
        }

        // Страницы приложения: не вошёл — на вход; чужой — на свою страницу
        if (!user) {
            location.replace('login.html');
            return;
        }

        var role = roleOf(user);
        if (!role) {
            showFatal('Этот аккаунт не имеет доступа к приложению.');
            auth.signOut();
            return;
        }
        if (role !== page.owner) {
            location.replace(HOME[role]);
            return;
        }

        window.__CURRENT_USER__ = user;
        resolveReady(user);
    });

    window.MudroAuth = {
        db: db,
        auth: auth,
        ready: ready,
        logout: function () { return auth.signOut(); }
    };
})();
