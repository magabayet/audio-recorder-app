#!/usr/bin/env node

const net = require('net');

/**
 * Encuentra un puerto disponible en el sistema
 * @param {number} startPort - Puerto inicial para buscar
 * @param {number} endPort - Puerto final para buscar
 * @returns {Promise<number>} Puerto disponible
 */
function findAvailablePort(startPort = 3000, endPort = 9999) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      if (port > endPort) {
        reject(new Error(`No hay puertos disponibles entre ${startPort} y ${endPort}`));
        return;
      }

      const server = net.createServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          // Puerto en uso, probar el siguiente
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });

      server.once('listening', () => {
        const actualPort = server.address().port;
        server.close(() => {
          resolve(actualPort);
        });
      });

      server.listen(port, '127.0.0.1');
    };

    tryPort(startPort);
  });
}

/**
 * Encuentra múltiples puertos disponibles
 * @param {number} count - Cantidad de puertos a encontrar
 * @param {number} startPort - Puerto inicial
 * @returns {Promise<number[]>} Array de puertos disponibles
 */
async function findMultiplePorts(count = 2, startPort = 3000) {
  const ports = [];
  let currentStart = startPort;

  for (let i = 0; i < count; i++) {
    const port = await findAvailablePort(currentStart, 9999);
    ports.push(port);
    currentStart = port + 1; // Buscar el siguiente desde un puerto mayor
  }

  return ports;
}

// Si se ejecuta directamente
if (require.main === module) {
  findMultiplePorts(2, 3000)
    .then(ports => {
      console.log(JSON.stringify({
        backend: ports[0],
        frontend: ports[1]
      }));
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

module.exports = { findAvailablePort, findMultiplePorts };