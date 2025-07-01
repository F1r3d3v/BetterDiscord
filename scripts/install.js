const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const args = process.argv;

const appData = (function () {
    const platform = process.platform;

    if (platform === 'win32') {
        return process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
    } else if (platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support');
    } else {
        return process.env.XDG_CONFIG_HOME || path.join(process.env.HOME, '.config');
    }
})();
const bdFolder = path.join(appData, "BetterDiscord");
const bdDataFolder = path.join(bdFolder, "data");
const bdPluginsFolder = path.join(bdFolder, "plugins");
const bdThemesFolder = path.join(bdFolder, "themes");

const releaseInput = args[2] && args[2].toLowerCase();
const release = releaseInput === "canary" ? "Discord Canary" : releaseInput === "ptb" ? "Discord PTB" : "Discord";
const discordPath = (function () {
    let resourcePath = "";
    if (process.platform === "win32") {
        const basedir = path.join(process.env.LOCALAPPDATA, release.replace(/ /g, ""));
        if (!fs.existsSync(basedir)) throw new Error(`Cannot find directory for ${release}`);
        const version = fs.readdirSync(basedir).filter(f => fs.lstatSync(path.join(basedir, f)).isDirectory() && f.split(".").length > 1).sort().reverse()[0];
        // To account for discord_desktop_core-1 or any other number
        const coreWrap = fs.readdirSync(path.join(basedir, version, "modules")).filter(e => e.indexOf("discord_desktop_core") === 0).sort().reverse()[0];
        resourcePath = path.join(basedir, version, "modules", coreWrap, "discord_desktop_core");
    }
    else {
        let userData = process.env.XDG_CONFIG_HOME ? process.env.XDG_CONFIG_HOME : path.join(process.env.HOME, ".config");
        if (process.platform === "darwin") userData = path.join(process.env.HOME, "Library", "Application Support");
        const basedir = path.join(userData, release.toLowerCase().replace(" ", ""));
        if (!fs.existsSync(basedir)) return "";
        const version = fs.readdirSync(basedir).filter(f => fs.lstatSync(path.join(basedir, f)).isDirectory() && f.split(".").length > 1).sort().reverse()[0];
        if (!version) return "";
        resourcePath = path.join(basedir, version, "modules", "discord_desktop_core");
    }

    if (fs.existsSync(resourcePath)) return resourcePath;
    return "";
})();

const compiledAsarPath = path.join(path.resolve(__dirname, "..", "dist"), "betterdiscord.asar");
const bdAsarPath = path.join(bdDataFolder, "betterdiscord.asar");

function log(entry) {
    console.log(entry);
}

function lognewline(entry) {
    console.log("\n" + entry);
}

function makeDirectories(...folders) {
    for (const folder of folders) {
        if (fs.existsSync(folder)) {
            log(`✅ Directory exists: ${folder}`);
            continue;
        }
        try {
            fs.mkdir(folder);
            log(`✅ Directory created: ${folder}`);
        }
        catch (err) {
            log(`❌ Failed to create directory: ${folder}`);
            log(`❌ ${err.message}`);
            return err;
        }
    }
}

async function compileAsar() {
    try {
        const spawn = child_process.spawn("pnpm", ["dist"], {
            cwd: path.join(__dirname, "..")
        });

        spawn.stdout.on('data', (data) => {
            log(data.toString().trim());
        });

        spawn.stderr.on('data', (data) => {
            log(data.toString().trim());
        });

        await new Promise((resolve, reject) => {
            spawn.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Process exited with code ${code}`));
            } else {
                resolve();
            }
            });
        });
        log("✅ Asar file compiled successfully");
    }
    catch (error) {
        log(`❌ Failed to compile asar file: ${error.message}`);
        throw error;
    }
}

async function compileAndInstallAsar() {
    try {
        await compileAsar();
        fs.copyFileSync(compiledAsarPath, bdAsarPath);
        log(`✅ Asar file installed successfully`);
    }
    catch (error) {
        log(`❌ Failed to install asar file: ${error.message}`);
        return error;
    }
}

function installVenmic() {
    const buildPath = path.join(path.resolve(__dirname, ".."), "thirdparty/venmic/build/Release", "venmic-addon.node");
    const targetPath = path.join(bdDataFolder, "venmic.node");

    try {
        fs.copyFileSync(buildPath, targetPath);
        log(`✅ Venmic installed successfully`);
    }
    catch (error) {
        log(`❌ Failed to install Venmic: ${error.message}`);
        return error;
    }
}

function injectShims(targetPath, asarPath) {
    log("Injecting into: " + targetPath);
    try {
        fs.writeFileSync(path.join(targetPath, "index.js"), `require("${asarPath.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}");\nmodule.exports = require("./core.asar");`);
        log("✅ Injection successful");
    }
    catch (err) {
        log(`❌ Could not inject shims to ${targetPath}`);
        log(`❌ ${err.message}`);
        return err;
    }
}

(async () => {
    lognewline("Creating required directories...");
    const makeDirErr = makeDirectories(bdFolder, bdDataFolder, bdThemesFolder, bdPluginsFolder);
    if (makeDirErr) return -1;
    log("✅ Directories created");


    lognewline("Compiling asar file");
    const compileErr = await compileAndInstallAsar();
    if (compileErr) return -1;
    log("✅ Asar installed");


    lognewline("Installing Venmic...");
    const venmicErr = installVenmic();
    if (venmicErr) return -1;
    log("✅ Venmic installed");


    lognewline("Injecting shims...");
    const injectErr = injectShims(discordPath, bdAsarPath);
    if (injectErr) return -1;
    log("✅ Shims injected");

    return 0;
})();

