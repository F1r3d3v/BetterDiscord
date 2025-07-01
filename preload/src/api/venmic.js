import { ipcRenderer as IPC } from "electron";
import * as IPCEvents from "common/constants/ipcevents";
import * as path from "path";

const venmic = (() => {
    let cache = null;
    const dataPath = process.env.BETTERDISCORD_DATA_PATH;
    const venmicPath = path.join(dataPath, "data", "venmic.node");

    return () => {
        if (cache) return cache;

        const venmic = __non_webpack_require__(venmicPath).PatchBay;
        return cache = new venmic();
    };
})();

export function getVoiceEnginePid() {
    const pid = venmic().list()
        .find(item =>
            item["application.process.binary"] === "Discord" &&
            item["node.name"] === "WEBRTC VoiceEngine" &&
            item["media.name"] === "playStream")
        ?.["application.process.id"];

    return pid ? parseInt(pid) : null;
}

export function list_active_sources() {
    return venmic().list().filter(item => !(item["application.process.binary"] === "Discord" &&
            item["node.name"] === "WEBRTC VoiceEngine"));
}

export function start_virtmic(include) {
    const data = {
        include,
        exclude: [
            { "media.class": "Stream/Input/Audio" },
            { "media.class": "Video/Source" },
            { "node.virtual": "true" }
        ],
        ignore_devices: true
    };

    const voiceEnginePid = getVoiceEnginePid();

    if (voiceEnginePid) {
        data.exclude.push({ "application.process.id": voiceEnginePid.toString() });
    }

    return venmic().link(data);
}

export function start_virtmic_system() {
    const data = {
        include: [],
        exclude: [
            { "media.class": "Stream/Input/Audio" },
            { "media.class": "Video/Source" },
            {
                "media.type": "Audio",
                "media.role": "DSP",
                "media.category": "Filter"
            },
            { "node.virtual": "true" },
        ],
        ignore_devices: true,
        only_speakers: false,
        only_default_speakers: false
    };

    const voiceEnginePid = getVoiceEnginePid();

    if (voiceEnginePid) {
        data.exclude.push({ "application.process.id": voiceEnginePid.toString() });
    }

    return venmic().link(data);
}

export function stop_virtmic() {
    venmic().unlink();
}
