const { spawn } = require('child_process');

// Función para obtener la lista de dispositivos de audio
async function getAudioDevices() {
  return new Promise((resolve, reject) => {
    const devices = { video: [], audio: [] };
    let output = '';
    
    const ffmpeg = spawn('ffmpeg', ['-f', 'avfoundation', '-list_devices', 'true', '-i', '']);
    
    ffmpeg.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    ffmpeg.on('close', () => {
      const lines = output.split('\n');
      let isVideo = false;
      let isAudio = false;
      
      lines.forEach(line => {
        if (line.includes('AVFoundation video devices:')) {
          isVideo = true;
          isAudio = false;
        } else if (line.includes('AVFoundation audio devices:')) {
          isVideo = false;
          isAudio = true;
        } else if (line.includes('[') && line.includes(']')) {
          const match = line.match(/\[(\d+)\]\s+(.+)/);
          if (match) {
            const device = {
              index: parseInt(match[1]),
              name: match[2].trim()
            };
            
            if (isVideo) {
              devices.video.push(device);
            } else if (isAudio) {
              devices.audio.push(device);
            }
          }
        }
      });
      
      resolve(devices);
    });
    
    ffmpeg.on('error', reject);
  });
}

// Función para encontrar el mejor dispositivo de audio para grabar
async function findBestAudioDevice(preferSystemAudio = false, preferZoom = false, preferTeams = false) {
  try {
    const devices = await getAudioDevices();
    console.log('Dispositivos de audio disponibles:', devices.audio);
    
    // Si se prefiere Zoom, buscar ZoomAudioDevice primero
    if (preferZoom) {
      const zoomDevice = devices.audio.find(d => 
        d.name.toLowerCase().includes('zoomaudiodevice')
      );
      if (zoomDevice) {
        console.log(`🎥 Usando dispositivo de Zoom: ${zoomDevice.name}`);
        console.log('📌 IMPORTANTE: Inicia Zoom ANTES de grabar');
        return zoomDevice.index;
      }
    }
    
    // Si se prefiere Teams, buscar Microsoft Teams Audio
    if (preferTeams) {
      const teamsDevice = devices.audio.find(d => 
        d.name.toLowerCase().includes('microsoft teams audio') ||
        d.name.toLowerCase().includes('teams audio')
      );
      if (teamsDevice) {
        console.log(`👥 Usando dispositivo de Teams: ${teamsDevice.name}`);
        console.log('📌 IMPORTANTE: Inicia Teams ANTES de grabar');
        return teamsDevice.index;
      }
    }
    
    // Primero buscar BlackHole o dispositivos agregados para audio del sistema
    if (preferSystemAudio) {
      // Buscar dispositivo agregado BlackHole + Mic (sistema + micrófono)
      const blackHoleMic = devices.audio.find(d => 
        d.name.toLowerCase().includes('blackhole') && 
        d.name.toLowerCase().includes('mic')
      );
      if (blackHoleMic) {
        console.log(`🎙️ Usando dispositivo agregado (sistema + micrófono): ${blackHoleMic.name}`);
        return blackHoleMic.index;
      }
      
      // Buscar dispositivo agregado genérico
      const aggregateDevice = devices.audio.find(d => 
        d.name.toLowerCase().includes('aggregate') ||
        d.name.toLowerCase().includes('agregado')
      );
      if (aggregateDevice) {
        console.log(`🎙️ Usando dispositivo agregado (sistema + micrófono): ${aggregateDevice.name}`);
        return aggregateDevice.index;
      }
      
      // NO usar BlackHole 64ch directamente porque tiene demasiados canales
      // Solo buscar BlackHole 2ch si existe
      const blackHole2ch = devices.audio.find(d => 
        d.name.toLowerCase().includes('blackhole') && 
        d.name.toLowerCase().includes('2ch')
      );
      if (blackHole2ch) {
        console.log(`🔊 Usando BlackHole 2ch (audio del sistema): ${blackHole2ch.name}`);
        console.log('⚠️  Nota: Solo se grabará el audio del sistema, no tu micrófono');
        return blackHole2ch.index;
      }
    }
    
    // Si no hay BlackHole o no se prefiere, buscar micrófono
    const priorities = [
      'Micrófono de MacBook Pro',
      'MacBook Pro Microphone',
      'Built-in Microphone',
      'Micrófono',
      'Microphone'
    ];
    
    for (const priority of priorities) {
      const device = devices.audio.find(d => 
        d.name.toLowerCase().includes(priority.toLowerCase())
      );
      if (device) {
        console.log(`🎤 Usando micrófono: ${device.name}`);
        console.log('⚠️  Nota: Solo se grabará tu micrófono, no el audio del sistema');
        console.log('💡 Para grabar audio del sistema, ejecuta: ./setup-system-audio.sh');
        return device.index;
      }
    }
    
    // Si no se encuentra ninguno preferido, usar el primero que no sea de software virtual
    const nonVirtualDevice = devices.audio.find(d => 
      !d.name.toLowerCase().includes('zoom') &&
      !d.name.toLowerCase().includes('teams') &&
      !d.name.toLowerCase().includes('meta') &&
      !d.name.toLowerCase().includes('virtual')
    );
    
    if (nonVirtualDevice) {
      console.log(`Usando dispositivo: ${nonVirtualDevice.name}`);
      return nonVirtualDevice.index;
    }
    
    // Como último recurso, usar el primer dispositivo
    if (devices.audio.length > 0) {
      console.log(`Usando dispositivo predeterminado: ${devices.audio[0].name}`);
      return devices.audio[0].index;
    }
    
    throw new Error('No se encontraron dispositivos de audio');
  } catch (error) {
    console.error('Error al buscar dispositivos de audio:', error);
    return 1; // Valor por defecto
  }
}

module.exports = {
  getAudioDevices,
  findBestAudioDevice
};