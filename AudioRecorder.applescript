-- Audio Recorder App Launcher
-- Este script inicia la aplicación de grabación de audio

on run
    set appPath to "/Users/miguelgabayetbodington/LOC_PROGRAM/JUL25/RECORDER"
    
    -- Abrir Terminal y ejecutar el script
    tell application "Terminal"
        -- Crear nueva ventana si es necesario
        if (count of windows) = 0 then
            do script ""
        end if
        
        -- Ejecutar el comando en la ventana activa
        do script "cd '" & appPath & "' && ./start-app.sh" in front window
        
        -- Minimizar Terminal después de 3 segundos
        delay 3
        set miniaturized of front window to true
    end tell
    
    -- Esperar un poco más para que los servicios se inicien
    delay 5
    
    -- Abrir el navegador con la aplicación
    tell application "Safari"
        activate
        open location "http://localhost:3000"
    end tell
    
    -- Mostrar notificación
    display notification "La aplicación está lista en http://localhost:3000" with title "Audio Recorder" subtitle "Aplicación iniciada correctamente" sound name "Glass"
end run