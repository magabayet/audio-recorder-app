# 🎙️ Cómo crear un ícono de aplicación para Audio Recorder

## Método 1: Doble clic directo (Más simple)
1. **Busca el archivo `start-app.command`** en esta carpeta
2. **Haz doble clic** en él para iniciar la aplicación
3. Si macOS te pide permisos, haz clic en "Abrir" 

### Para agregarlo al Dock:
- Arrastra el archivo `start-app.command` al Dock (al lado derecho, junto a la papelera)

---

## Método 2: Crear una Aplicación con Automator (Recomendado)

### Pasos para crear la aplicación:

1. **Abre Automator** (búscalo en Spotlight con Cmd+Espacio)

2. **Crea un nuevo documento**
   - Selecciona "Aplicación" como tipo de documento

3. **Agrega la acción "Ejecutar Shell Script"**
   - En la barra lateral izquierda, busca "Ejecutar Shell Script"
   - Arrástralo al área de trabajo

4. **Configura el script**
   - En el menú desplegable, cambia `/bin/bash` si no está seleccionado
   - Pega este código:
   ```bash
   cd /Users/miguelgabayetbodington/LOC_PROGRAM/JUL25/RECORDER
   ./start-app.sh
   ```

5. **Guarda la aplicación**
   - Ve a Archivo → Guardar
   - Nombre: "Audio Recorder"
   - Ubicación: Aplicaciones (o donde prefieras)
   - Formato: Aplicación

6. **Personaliza el ícono (opcional)**
   - Descarga un ícono de micrófono de internet (formato .icns o .png)
   - Haz clic derecho en tu nueva aplicación → "Obtener información"
   - Arrastra el nuevo ícono sobre el ícono actual en la esquina superior izquierda

### Agregar al Dock:
- Arrastra la aplicación creada desde la carpeta Aplicaciones al Dock

---

## Método 3: Crear acceso directo en el Escritorio

1. **Opción A - Alias:**
   - Haz clic derecho en `start-app.command`
   - Selecciona "Crear alias"
   - Mueve el alias al Escritorio
   - Renómbralo como "Audio Recorder"

2. **Opción B - Enlace simbólico:**
   - Abre Terminal
   - Ejecuta:
   ```bash
   ln -s /Users/miguelgabayetbodington/LOC_PROGRAM/JUL25/RECORDER/start-app.command ~/Desktop/AudioRecorder
   ```

---

## Método 4: Agregar al Launchpad

1. Crea la aplicación con Automator (Método 2)
2. Guárdala en la carpeta `/Applications`
3. Aparecerá automáticamente en Launchpad

---

## 🚀 Inicio automático al encender la Mac (Opcional)

1. **Ve a Configuración del Sistema**
2. **General → Elementos de inicio de sesión**
3. **Haz clic en el botón "+"**
4. **Busca y selecciona** tu aplicación o el archivo `start-app.command`
5. **Haz clic en "Agregar"**

---

## 🛠️ Solución de problemas

### Si aparece "No se puede abrir porque no es de un desarrollador identificado":
1. Ve a **Configuración del Sistema → Privacidad y seguridad**
2. En la sección "Seguridad", verás un mensaje sobre la app bloqueada
3. Haz clic en **"Abrir de todas formas"**

### Si el script no funciona:
1. Abre Terminal
2. Ejecuta estos comandos:
```bash
cd /Users/miguelgabayetbodington/LOC_PROGRAM/JUL25/RECORDER
chmod +x start-app.sh
chmod +x start-app.command
```

### Para detener la aplicación:
- Si usaste el método de Terminal: Presiona `Ctrl+C` en la ventana de Terminal
- O cierra la ventana de Terminal (te preguntará si quieres terminar los procesos)

---

## 📝 Notas importantes

- **Asegúrate de tener tu API key de OpenAI** configurada en `backend/.env`
- La primera vez puede tardar más en iniciar mientras instala dependencias
- La aplicación se abre automáticamente en http://localhost:3000
- El servidor backend corre en http://localhost:5001

---

## 🎯 Método más rápido para uso diario

1. **Arrastra `start-app.command` al Dock**
2. **Haz clic en el ícono del Dock cuando quieras usar la app**
3. **Terminal se abrirá y minimizará automáticamente**
4. **El navegador se abrirá con la aplicación**

¡Listo! Ahora tienes tu aplicación de grabación con un ícono fácil de acceder.