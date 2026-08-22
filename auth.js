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

    function emailsConfigured() {
        return !!(emails.anna || emails.tanya);
    }

    function accessMessage() {
        return emailsConfigured()
            ? 'Этот аккаунт не имеет доступа к приложению.'
            : 'Роли не настроены: заполните <b>ROLE_EMAILS</b> в файле firebase-config.js.';
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
                    if (window.MudroLogin) window.MudroLogin.showError(accessMessage());
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
            showFatal(accessMessage());
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

    // ============================================================
    //  Ежедневное резервное копирование в 19:00.
    //  Если страница открыта позже — бэкап выполняется догоняющим
    //  запуском при первом открытии после 19:00.
    //  Файл скачивается в «Загрузки», копия также хранится
    //  в localStorage под ключом mudro.autoBackup.
    // ============================================================
    var BACKUP_HOUR = 19;
    var LS_LAST = 'mudro.lastBackupAt';
    var LS_SNAP = 'mudro.autoBackup';

    function pad2(n) { return n < 10 ? '0' + n : '' + n; }

    function collectBackup(role) {
        var payload = { app: 'МУДРО', type: 'auto-backup', createdAt: new Date().toISOString(), role: role, data: {} };
        var owners = role === 'anna' ? ['anna', 'tanya'] : ['tanya'];
        var chain = Promise.resolve();
        owners.forEach(function (o) {
            chain = chain.then(function () {
                return db.collection('schedules').doc(o).get().then(function (s) {
                    var entry = {};
                    if (s.exists) {
                        var d = s.data();
                        entry.schedule = d.schedule || {};
                        entry.times = d.times || [];
                    }
                    return db.collection('tasks').doc(o).get().then(function (t) {
                        if (t.exists) entry.tasks = (t.data() && t.data().tasks) || [];
                        payload.data[o] = entry;
                    });
                }).catch(function () { payload.data[o] = {}; });
            });
        });
        chain = chain.then(function () {
            var q = role === 'anna'
                ? db.collection('students')
                : db.collection('students').where('owner', '==', 'tanya');
            return q.get().then(function (qs) {
                var arr = [];
                qs.forEach(function (d) { var v = d.data(); v.id = d.id; arr.push(v); });
                payload.students = arr;
            }).catch(function () { payload.students = []; });
        });
        return chain.then(function () { return payload; });
    }

    function runDailyBackup(user) {
        var role = roleOf(user);
        if (!role) return Promise.reject(new Error('no role'));
        return collectBackup(role).then(function (payload) {
            var json = JSON.stringify(payload, null, 2);
            try {
                localStorage.setItem(LS_SNAP, json);
                localStorage.setItem(LS_LAST, String(Date.now()));
            } catch (e) {}
            try {
                var now = new Date();
                var name = 'backup_МУДРО_' + now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate()) + '.json';
                var blob = new Blob([json], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
                if (typeof window.showNotification === 'function') {
                    window.showNotification('Резервная копия создана: ' + name);
                }
            } catch (e) {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('Копия сохранена локально (скачивание заблокировано браузером)');
                }
            }
        });
    }

    function checkBackupTime() {
        try {
            var now = new Date();
            var due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), BACKUP_HOUR, 0, 0, 0);
            var last = Number(localStorage.getItem(LS_LAST) || 0);
            if (now.getTime() >= due.getTime() && last < due.getTime() && auth.currentUser) {
                runDailyBackup(auth.currentUser).catch(console.error);
            }
        } catch (e) {}
    }

    // ===== Восстановление из файла бэкапа (кнопка видна только админу) =====
    function restorePayload(payload) {
        var owners = Object.keys(payload.data || {});
        var chain = Promise.resolve();
        owners.forEach(function (o) {
            var d = payload.data[o] || {};
            chain = chain.then(function () {
                return db.collection('schedules').doc(o).set({
                    schedule: d.schedule || {},
                    times: Array.isArray(d.times) ? d.times : Object.keys(d.schedule || {}),
                    seededAt: Date.now()
                });
            }).then(function () {
                return db.collection('tasks').doc(o).set({
                    tasks: Array.isArray(d.tasks) ? d.tasks : [],
                    seededAt: Date.now()
                });
            }).catch(function (err) { console.error('restore ' + o, err); });
        });
        if (Array.isArray(payload.students)) {
            chain = chain.then(function () {
                var col = db.collection('students');
                var batch = db.batch();
                payload.students.forEach(function (s) {
                    var id = s.id || col.doc().id;
                    var copy = {};
                    Object.keys(s).forEach(function (k) { if (k !== 'id') copy[k] = s[k]; });
                    if (!copy.owner) copy.owner = 'tanya';
                    batch.set(col.doc(id), copy);
                });
                return batch.commit().catch(function (err) { console.error('restore students', err); });
            });
        }
        return chain;
    }

    function importBackupFile(input) {
        var file = input && input.files && input.files[0];
        if (input) input.value = '';
        if (!file || !auth.currentUser) return;
        if (!confirm('Восстановить данные из файла «' + file.name + '»?\n\nРасписания, задачи и ученики будут перезаписаны данными из бэкапа.')) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            var payload;
            try { payload = JSON.parse(e.target.result); }
            catch (err) { alert('Не удалось прочитать файл: это не JSON.'); return; }
            if (!payload || payload.type !== 'auto-backup' || !payload.data) {
                alert('Файл не похож на резервную копию МУДРО.');
                return;
            }
            restorePayload(payload)
                .then(function () {
                    if (typeof window.showNotification === 'function') {
                        window.showNotification('Данные восстановлены из бэкапа!');
                    }
                })
                .catch(function (err) {
                    console.error(err);
                    alert('Ошибка восстановления: ' + err.message);
                });
        };
        reader.readAsText(file, 'utf8');
    }

    window.MudroAuth = {
        db: db,
        auth: auth,
        ready: ready,
        rolesConfigured: emailsConfigured(),
        logout: function () { return auth.signOut(); },
        backupNow: function () {
            return auth.currentUser
                ? runDailyBackup(auth.currentUser)
                : Promise.reject(new Error('not signed in'));
        },
        importBackupFile: importBackupFile
    };

    ready.then(function (user) {
        var bar = document.getElementById('backupImportBar');
        if (bar && roleOf(user) === 'anna') bar.style.display = 'block';
        setTimeout(checkBackupTime, 15000);
        setInterval(checkBackupTime, 60 * 1000);
    });
})();
