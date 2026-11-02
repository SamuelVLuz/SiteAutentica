(function () {
    const clarityProjectId = "yxsg4cdajs";
    const allowedModes = new Set(["comparacao", "barra", "tempo", "estrelas"]);
    const aliases = {
        comparacao: "comparacao", comparação: "comparacao", score: "comparacao",
        barra: "barra", bar: "barra",
        tempo: "tempo", time: "tempo",
        estrelas: "estrelas", stars: "estrelas",
        todos: "todos", all: "todos",
        nenhum: "nenhum", none: "nenhum", sem: "nenhum"
    };
    const params = new URLSearchParams(window.location.search);
    const rawMode = (params.get("modo") || "").trim().toLocaleLowerCase("pt-BR");
    const mode = rawMode ? (aliases[rawMode] || "nenhum") : "nenhum";
    const stage = document.documentElement.dataset.experimentStage || "experimento";
    const tracked = allowedModes.has(mode);
    const modeForStorage = mode;

    function makeParticipantId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    }

    function participantId() {
        let id = sessionStorage.getItem("experimento_id");
        if (!id) {
            id = makeParticipantId();
            sessionStorage.setItem("experimento_id", id);
        }
        sessionStorage.setItem("modo_experimento", modeForStorage);
        return id;
    }

    function startClarity(currentStage) {
        if (!tracked) return;
        const id = participantId();
        window.clarity = window.clarity || function () {
            (window.clarity.q = window.clarity.q || []).push(arguments);
        };
        window.clarity("set", "etapa", currentStage);
        window.clarity("set", "modo_experimento", mode);
        window.clarity("set", "experimento_id", id);
        if (!document.querySelector("script[data-clarity-project]")) {
            const script = document.createElement("script");
            script.async = true;
            script.src = "https://www.clarity.ms/tag/" + clarityProjectId;
            script.dataset.clarityProject = "true";
            document.head.appendChild(script);
        }
    }

    function flowUrl(path) {
        const url = new URL(path, window.location.href);
        if (params.has("modo")) url.searchParams.set("modo", mode);
        return url.href;
    }

    document.querySelectorAll("[data-flow-destination]").forEach(link => {
        link.href = flowUrl(link.dataset.flowDestination);
    });

    if (stage === "pre") {
        const consent = document.getElementById("study-consent");
        const start = document.getElementById("start-experiment");
        if (consent && start) {
            start.disabled = !consent.checked;
            consent.addEventListener("change", () => { start.disabled = !consent.checked; });
            start.addEventListener("click", event => {
                event.preventDefault();
                if (!consent.checked) return;
                participantId();
                startClarity("pre");
                start.disabled = true;
                window.setTimeout(() => { window.location.href = flowUrl("register.html"); }, tracked ? 350 : 0);
            });
        }
    } else {
        participantId();
        startClarity(stage);
    }

    const surveyFrame = document.getElementById("post-survey-frame");
    const idForSurvey = sessionStorage.getItem("experimento_id") || "";
    const formUrl = (window.POST_SURVEY_EMBED_URL || "")
        .replaceAll("{experimento_id}", encodeURIComponent(idForSurvey))
        .replaceAll("{modo_experimento}", encodeURIComponent(mode));
    if (surveyFrame && formUrl) {
        surveyFrame.src = formUrl;
    }

    const codeElement = document.getElementById("participant-code");
    const modeElement = document.getElementById("participant-mode");
    if (codeElement) codeElement.textContent = idForSurvey || "Não foi possível recuperar o código desta sessão.";
    if (modeElement) modeElement.textContent = mode;
    const copyButton = document.getElementById("copy-participant-code");
    if (copyButton) copyButton.addEventListener("click", async () => {
        const status = document.getElementById("copy-code-status");
        try {
            await navigator.clipboard.writeText(idForSurvey);
            if (status) status.textContent = "Código copiado.";
        } catch (_) {
            if (status) status.textContent = "Selecione e copie o código acima.";
        }
    });
})();
