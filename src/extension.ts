import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import * as os from 'os';
import { CdpMonitor } from './cdpMonitor';

declare const console: any;

let statusBarItem: vscode.StatusBarItem;
let isEnabled = true;
let cdpMonitor: CdpMonitor | null = null;

// 防抖：避免短时间内重复触发
let lastPlayTime = 0;
const DEBOUNCE_MS = 3000;

export function activate(context: vscode.ExtensionContext) {
    console.log('Antigravity Task Sound v2.0 is now active!');

    // 读取初始设置
    const config = vscode.workspace.getConfiguration('antigravityTaskSound');
    isEnabled = config.get<boolean>('enabled', true);
    const cdpPort = config.get<number>('cdpPort', 9000);
    const cdpEnabled = config.get<boolean>('cdpEnabled', true);

    // 创建状态栏按钮
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'antigravityTaskSound.toggle';
    updateStatusBar();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // ======== 命令注册 ========

    // 测试声音
    context.subscriptions.push(
        vscode.commands.registerCommand('antigravityTaskSound.testSound', () => {
            playSound(context);
            vscode.window.showInformationMessage('🔔 正在播放测试声音...');
        })
    );

    // 切换开关
    context.subscriptions.push(
        vscode.commands.registerCommand('antigravityTaskSound.toggle', () => {
            isEnabled = !isEnabled;
            vscode.workspace.getConfiguration('antigravityTaskSound')
                .update('enabled', isEnabled, vscode.ConfigurationTarget.Global);
            updateStatusBar();
            vscode.window.showInformationMessage(
                isEnabled ? '🔔 任务声音通知已开启' : '🔕 任务声音通知已关闭'
            );
        })
    );

    // 手动连接 CDP
    context.subscriptions.push(
        vscode.commands.registerCommand('antigravityTaskSound.connectCdp', async () => {
            if (cdpMonitor) {
                cdpMonitor.disconnect();
            }
            const port = vscode.workspace.getConfiguration('antigravityTaskSound').get<number>('cdpPort', 9000);
            cdpMonitor = new CdpMonitor(port, () => {
                if (isEnabled) { playSound(context); }
            });
            cdpMonitor.setStatusBar(statusBarItem);
            const connected = await cdpMonitor.connect();
            if (connected) {
                vscode.window.showInformationMessage('✅ CDP 连接成功！现在可以检测 AI 回复完成');
            } else {
                vscode.window.showWarningMessage(
                    `❌ CDP 连接失败。请确保 Antigravity 以 --remote-debugging-port=${port} 启动`
                );
            }
        })
    );

    // 监听设置变化  
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('antigravityTaskSound.enabled')) {
                isEnabled = vscode.workspace.getConfiguration('antigravityTaskSound')
                    .get<boolean>('enabled', true);
                updateStatusBar();
            }
            if (e.affectsConfiguration('antigravityTaskSound.cdpPort')) {
                const newPort = vscode.workspace.getConfiguration('antigravityTaskSound')
                    .get<number>('cdpPort', 9000);
                if (cdpMonitor) {
                    cdpMonitor.updatePort(newPort);
                }
            }
        })
    );

    // ======== 事件监听 ========

    // 终端关闭
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal((_t: vscode.Terminal) => {
            if (isEnabled && !cdpMonitor?.isConnected()) {
                playSound(context);
            }
        })
    );

    // Task 完成
    context.subscriptions.push(
        vscode.tasks.onDidEndTaskProcess((_e: vscode.TaskProcessEndEvent) => {
            if (isEnabled && !cdpMonitor?.isConnected()) {
                playSound(context);
            }
        })
    );

    // ======== 自动连接 CDP ========
    if (cdpEnabled) {
        setTimeout(async () => {
            cdpMonitor = new CdpMonitor(cdpPort, () => {
                if (isEnabled) { playSound(context); }
            });
            cdpMonitor.setStatusBar(statusBarItem);
            const connected = await cdpMonitor.connect();
            if (connected) {
                console.log('[TaskSound] CDP auto-connected');
            } else {
                console.log('[TaskSound] CDP auto-connect failed, falling back to terminal events');
                updateStatusBar();
            }
        }, 3000); // 延迟 3 秒等 IDE 完全启动
    }
}

function updateStatusBar() {
    if (cdpMonitor?.isConnected()) {
        statusBarItem.text = isEnabled ? '$(bell) CDP 已连接' : '$(bell-slash) CDP 已连接';
    } else {
        statusBarItem.text = isEnabled ? '$(bell) 声音通知' : '$(bell-slash) 声音通知';
    }
    statusBarItem.tooltip = [
        `声音通知：${isEnabled ? '已开启' : '已关闭'}`,
        `CDP：${cdpMonitor?.isConnected() ? '已连接' : '未连接'}`,
        '点击切换开关',
    ].join('\n');
}

function playSound(context: vscode.ExtensionContext) {
    const now = Date.now();
    if (now - lastPlayTime < DEBOUNCE_MS) { return; }
    lastPlayTime = now;

    const config = vscode.workspace.getConfiguration('antigravityTaskSound');
    const customSoundFile = config.get<string>('soundFile', '');
    const volume = config.get<number>('volume', 50);

    let soundPath: string;
    if (customSoundFile && customSoundFile.trim() !== '') {
        soundPath = customSoundFile;
    } else {
        soundPath = path.join(context.extensionPath, 'sounds', 'task-complete.wav');
    }

    const platform = os.platform();
    let command: string;

    if (platform === 'win32') {
        const vol = volume / 100;
        command = `powershell -NoProfile -Command "Add-Type -AssemblyName PresentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open([uri]'${soundPath.replace(/'/g, "''")}'); $player.Volume = ${vol}; $player.Play(); Start-Sleep -Milliseconds 1500"`;
    } else if (platform === 'darwin') {
        const vol = Math.round(volume * 2.55);
        command = `afplay -v ${vol / 255} "${soundPath}"`;
    } else {
        const vol = Math.round(volume * 655.35);
        command = `paplay --volume=${vol} "${soundPath}"`;
    }

    exec(command, (error: Error | null) => {
        if (error) {
            console.error('[TaskSound] Failed to play sound:', error.message);
            if (platform === 'win32') {
                exec('powershell -NoProfile -Command "[System.Media.SystemSounds]::Asterisk.Play()"');
            }
        }
    });
}

export function deactivate() {
    if (cdpMonitor) {
        cdpMonitor.disconnect();
        cdpMonitor = null;
    }
}
