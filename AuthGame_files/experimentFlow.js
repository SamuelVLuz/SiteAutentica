(function () {
    const clarityProjectId = "yxsg4cdajs";
    const randomModes = ["comparacao", "barra", "tempo", "estrelas", "nenhum"];
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
    let mode = rawMode ? (aliases[rawMode] || "nenhum") : (sessionStorage.getItem("modo_experimento") || "");
    if (!mode || mode === "todos") {
        mode = rawMode ? "todos" : randomModes[Math.floor(Math.random() * randomModes.length)];
    }
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
        if (!tracked || sessionStorage.getItem("clarity_consent") !== "yes") return Promise.resolve();
        const id = participantId();
        const continueAfterBriefWait = promise => Promise.race([
            promise,
            new Promise(resolve => window.setTimeout(resolve, 1500))
        ]);
        window.clarity = window.clarity || function () {
            (window.clarity.q = window.clarity.q || []).push(arguments);
        };
        const setTags = () => {
            window.clarity("set", "etapa", currentStage);
            window.clarity("set", "modo_experimento", mode);
            window.clarity("set", "experimento_id", id);
        };
        // Queue the tags immediately, then repeat after the Clarity library is ready.
        setTags();

        let script = document.querySelector("script[data-clarity-project]");
        if (script) {
            if (script.dataset.clarityLoaded === "true") setTags();
            else script.addEventListener("load", () => {
                script.dataset.clarityLoaded = "true";
                setTags();
            }, { once: true });
            return continueAfterBriefWait(new Promise(resolve => {
                if (script.dataset.clarityLoaded === "true") resolve();
                else script.addEventListener("load", resolve, { once: true });
            }));
        }

        script = document.createElement("script");
        script.async = true;
        script.src = "https://www.clarity.ms/tag/" + clarityProjectId;
        script.dataset.clarityProject = "true";
        const ready = new Promise(resolve => {
            script.addEventListener("load", () => {
                script.dataset.clarityLoaded = "true";
                setTags();
                resolve();
            }, { once: true });
            script.addEventListener("error", resolve, { once: true });
        });
        document.head.appendChild(script);
        return continueAfterBriefWait(ready);
    }

    function flowUrl(path) {
        const url = new URL(path, window.location.href);
        url.searchParams.set("modo", mode);
        return url.href;
    }

    document.querySelectorAll("[data-flow-destination]").forEach(link => {
        link.href = flowUrl(link.dataset.flowDestination);
    });

    if (stage === "pre") {
        const consent = document.getElementById("study-consent");
        const clarityConsent = document.getElementById("clarity-consent");
        const start = document.getElementById("start-experiment");
        if (consent && start) {
            start.disabled = !consent.checked;
            consent.addEventListener("change", () => { start.disabled = !consent.checked; });
            start.addEventListener("click", event => {
                event.preventDefault();
                if (!consent.checked) return;
                participantId();
                sessionStorage.setItem("clarity_consent", clarityConsent?.checked ? "yes" : "no");
                start.disabled = true;
                startClarity("pre").then(() => {
                    window.location.href = flowUrl("register.html");
                });
            });
        }
    } else {
        participantId();
        startClarity(stage);
    }

    const surveyFrame = document.getElementById("post-survey-frame");
    const surveyBootstrap = document.getElementById("post-survey-bootstrap");
    const surveyStatus = document.getElementById("post-survey-status");
    const surveyUrl = (window.POST_SURVEY_WEB_APP_URL || "").trim();
    if (surveyFrame && surveyBootstrap && surveyUrl) {
        const idForSurvey = sessionStorage.getItem("experimento_id") || "";
        const entropyBits = sessionStorage.getItem("entropia_senha_bits");
        surveyBootstrap.action = surveyUrl;
        surveyBootstrap.elements.namedItem("experimentId").value = idForSurvey;
        surveyBootstrap.elements.namedItem("mode").value = mode;
        surveyBootstrap.elements.namedItem("entropyBits").value = entropyBits || "";
        surveyBootstrap.elements.namedItem("attempts").value = sessionStorage.getItem("tentativas_senha") || "0";
        surveyBootstrap.elements.namedItem("durationSeconds").value = sessionStorage.getItem("duracao_experimento_segundos") || "0";
        surveyFrame.hidden = false;
        if (surveyStatus) surveyStatus.hidden = true;
        surveyBootstrap.submit();
    }
})();
