import * as webllm from "https://esm.run/@mlc-ai/web-llm";

/*************** WebLLM logic ***************/
const messages = [
  {
    content: "You are a helpful AI agent helping users.",
    role: "system",
  },
];

const availableModels = webllm.prebuiltAppConfig.model_list.map(
  (m) => m.model_id,
);

// Função para salvar o modelo selecionado no localStorage
function saveSelectedModel(model) {
  localStorage.setItem('selectedModel', model);
}

// Função para carregar o modelo salvo do localStorage (ou usar o padrão)
function loadSelectedModel() {
  const savedModel = localStorage.getItem('selectedModel');
  return savedModel ? savedModel : "Llama-3.1-8B-Instruct-q4f32_1-1k"; // Default
}

let selectedModel = loadSelectedModel(); // Carregar o modelo salvo ou usar o padrão

// Callback function for initializing progress
function updateEngineInitProgressCallback(report) {
  console.log("initialize", report.progress);
  document.getElementById("download-status").textContent = report.text;
}

// Create engine instance
const engine = new webllm.MLCEngine();
engine.setInitProgressCallback(updateEngineInitProgressCallback);

async function initializeWebLLMEngine() {
  document.getElementById("download-status").classList.remove("hidden");
  selectedModel = document.getElementById("model-selection").value;
  saveSelectedModel(selectedModel); // Salvar modelo ao inicializar
  const config = {
    temperature: 1.0,
    top_p: 1,
  };
  await engine.reload(selectedModel, config);
}

async function streamingGenerating(messages, onUpdate, onFinish, onError) {
  try {
    let curMessage = "";
    let usage;
    const completion = await engine.chat.completions.create({
      stream: true,
      messages,
      stream_options: { include_usage: true },
    });
    for await (const chunk of completion) {
      const curDelta = chunk.choices[0]?.delta.content;
      if (curDelta) {
        curMessage += curDelta;
      }
      if (chunk.usage) {
        usage = chunk.usage;
      }
      onUpdate(curMessage);
    }
    const finalMessage = await engine.getMessage();
    onFinish(finalMessage, usage);
  } catch (err) {
    onError(err); // Certifique-se de que `onError` seja uma função
  }
}

function onMessageSend() {
  const input = document.getElementById("user-input").value.trim();
  const message = {
    content: input,
    role: "user",
  };
  if (input.length === 0) {
    return;
  }
  document.getElementById("send").disabled = true;

  messages.push(message);
  var message_container = appendMessage(message);

  document.getElementById("user-input").value = "";
  document
    .getElementById("user-input")
    .setAttribute("placeholder", "Generating...");

  const aiMessage = {
    content: "typing...",
    role: "assistant",
  };
  appendMessage(aiMessage);

  const onFinishGenerating = (finalMessage, usage) => {
    console.log(message_container);
    updateLastMessage(finalMessage, message_container);
    document.getElementById("send").disabled = false;
    const usageText =
      `prompt_tokens: ${usage.prompt_tokens}, ` +
      `completion_tokens: ${usage.completion_tokens}, ` +
      `prefill: ${usage.extra.prefill_tokens_per_s.toFixed(4)} tokens/sec, ` +
      `decoding: ${usage.extra.decode_tokens_per_s.toFixed(4)} tokens/sec`;
    document.getElementById("chat-stats").classList.remove("hidden");
    document.getElementById("chat-stats").textContent = usageText;
  };

  const handleError = (err) => {
    console.error("Erro durante o processamento:", err);
    document.getElementById("send").disabled = false; // Reabilitar o botão enviar em caso de erro
    // Você pode adicionar uma mensagem de erro ao chat, se necessário
  };

  // Passando `message_container` para `streamingGenerating` para que `onFinishGenerating` tenha acesso a ele
  streamingGenerating(
    messages,
    (curMessage) => {
      // Atualiza a mensagem à medida que chega
      updateLastMessage(curMessage, message_container);
    },
    onFinishGenerating,
    handleError // Passa a função de tratamento de erros
  );
}

function speak(text) {
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = 'en-US';
  speech.rate = 1; // Velocidade da fala
  speech.pitch = 1; // Tom da voz
  speech.volume = 1; // Volume (0 a 1)

  // Seleciona a voz mais natural
  const voices = speechSynthesis.getVoices();
  const naturalVoice = voices.find(voice => voice.name.includes('Google US English')); // Altere o nome conforme necessário

  if (naturalVoice) {
      speech.voice = naturalVoice;
  }

  window.speechSynthesis.speak(speech);
}

function addSpeakButton(container, text) {
  const speakButton = document.createElement("button");
  speakButton.textContent = "🔊"; // Ícone de alto-falante
  speakButton.classList.add("ml-2", "bg-gray-300", "text-gray-900", "rounded-full", "p-1");

  speakButton.addEventListener('click', () => speak(text));

  container.appendChild(speakButton);
}

// Carregar as vozes disponíveis
speechSynthesis.onvoiceschanged = () => {
  const voices = speechSynthesis.getVoices();
  console.log(voices); // Lista as vozes no console para que você possa escolher uma
};

function appendMessage(message) {
  const chatBox = document.getElementById("chat-box");
  const container = document.createElement("div");
  container.classList.add("message-container", "mb-4", "p-3", "rounded-lg");

  const newMessage = document.createElement("div");
  newMessage.classList.add("message", "text-base", "p-2", "rounded-lg", "shadow");

  newMessage.textContent = message.content;

  if (message.role === "user") {
    newMessage.classList.add("bg-blue-100", "text-blue-900", "self-end");
  } else {
    newMessage.classList.add("bg-gray-100", "text-gray-900", "self-start");
  }

  container.appendChild(newMessage);
  chatBox.appendChild(container);
  chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the latest message
  return container
}

function updateLastMessage(content, container) {
  const messageDoms = document
    .getElementById("chat-box")
    .querySelectorAll(".message");
  const lastMessageDom = messageDoms[messageDoms.length - 1];
  lastMessageDom.textContent = content;
  addSpeakButton(lastMessageDom, content);
}

/*************** UI binding ***************/
availableModels.forEach((modelId) => {
  const option = document.createElement("option");
  option.value = modelId;
  option.textContent = modelId;
  document.getElementById("model-selection").appendChild(option);
});

// Carregar o modelo salvo ao inicializar a página
document.getElementById("model-selection").value = selectedModel;

// Atualizar o modelo selecionado quando o usuário mudar a seleção
document.getElementById("model-selection").addEventListener("change", function () {
  selectedModel = this.value;
  saveSelectedModel(selectedModel); // Salvar o modelo no localStorage
});

// Iniciar o modelo ao clicar no botão de download
document.getElementById("download").addEventListener("click", function () {
  initializeWebLLMEngine().then(() => {
    document.getElementById("send").disabled = false;
  });
});

// Enviar a mensagem ao clicar no botão de envio
document.getElementById("send").addEventListener("click", function () {
  onMessageSend();
});
