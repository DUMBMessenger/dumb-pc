export async function monitorServer(checkServerConnection, currentServerUrl) {
    try {
        const connected = await checkServerConnection(currentServerUrl);
        console.log("Состояние сервера:", connected ? "подключен" : "отключен");
    } catch (err) {
        console.error("Ошибка при проверке сервера:", err);
    } finally {
        setTimeout(monitorServer, 5000, checkServerConnection, currentServerUrl);
    }
}