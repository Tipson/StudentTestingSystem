import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const isPortFree = (port) =>
    new Promise((resolve) => {
        const server = createServer();
        server.unref();
        server.on('error', () => resolve(false));
        server.listen({port, host: HOST}, () => {
            server.close(() => resolve(true));
        });
    });

const findFreePort = async (startPort, tries = 20) => {
    for (let i = 0; i < tries; i += 1) {
        const port = startPort + i;
        const free = await isPortFree(port);
        if (free) return port;
    }
    return startPort;
};

const isPrivateIp = (ip) => {
    if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
    if (ip.startsWith('172.')) return true;
    return false;
};

const isVirtualInterface = (name = '') => {
    const n = name.toLowerCase();
    return (
        n.includes('virtual') ||
        n.includes('vbox') ||
        n.includes('vmware') ||
        n.includes('hyper-v') ||
        n.includes('vethernet') ||
        n.includes('wsl')
    );
};

const getLanIps = () => {
    const nets = os.networkInterfaces();
    const results = [];
    for (const [name, list] of Object.entries(nets)) {
        for (const net of list || []) {
            if (net.family !== 'IPv4' || net.internal) continue;
            if (net.address.startsWith('169.254.')) continue;
            if (isVirtualInterface(name)) continue;
            if (isPrivateIp(net.address)) {
                results.push({name, address: net.address});
            }
        }
    }

    results.sort((a, b) => {
        const score = (addr) => {
            if (addr.startsWith('192.168.')) return 0;
            if (addr.startsWith('10.')) return 1;
            if (addr.startsWith('172.')) return 2;
            return 3;
        };
        return score(a.address) - score(b.address);
    });

    return results;
};

const port = await findFreePort(DEFAULT_PORT);
const env = {...process.env, PORT: String(port), HOST};

console.log(`Dev server port: ${port}`);
console.log(`Local: http://localhost:${port}`);
const lanIps = getLanIps();
if (lanIps.length) {
    lanIps.forEach(({address}, idx) => {
        const label = idx === 0 ? 'LAN' : `LAN#${idx + 1}`;
        console.log(`${label}: http://${address}:${port}`);
    });
} else {
    console.log('LAN: not found');
}

const cracoBin = path.join(
    rootDir,
    'node_modules',
    '@craco',
    'craco',
    'dist',
    'bin',
    'craco.js',
);

const child = spawn(process.execPath, [cracoBin, 'start'], {
    cwd: rootDir,
    stdio: 'inherit',
    env,
});

child.on('exit', (code) => {
    process.exit(code ?? 0);
});
