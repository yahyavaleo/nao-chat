const languageMap = {
  English: "en",
  Español: "es",
  Français: "fr",
  Deutsch: "de",
  Italiano: "it",
  Hindi: "hi",
};

let sourceLanguage = "Hindi";
let targetLanguage = "English";

function initializeLanguageSwitchers() {
  const languageSwitchers = document.querySelectorAll(".language-switcher");

  languageSwitchers.forEach((languageSwitcher) => {
    const selectedLanguage =
      languageSwitcher.querySelector(".selected-language");
    const languageOptions = languageSwitcher.querySelector(".language-options");
    const dropdownArrow = languageSwitcher.querySelector(".dropdown-arrow");

    // Toggle dropdown
    selectedLanguage.addEventListener("click", () => {
      languageOptions.classList.toggle("active");
      dropdownArrow.classList.toggle("active");
    });

    // Handle language selection
    languageSwitcher.querySelectorAll(".language-option").forEach((option) => {
      option.addEventListener("click", () => {
        const flag = option.querySelector(".fi").className;
        const language = option.querySelector("span:not(.fi)").textContent;

        // Update selected language
        selectedLanguage.querySelector(".fi").className = flag;
        selectedLanguage.querySelector("span:not(.fi)").textContent = language;

        // Update global variables
        if (languageSwitcher.id === "left-switcher") {
          sourceLanguage = language;
        } else {
          targetLanguage = language;
        }

        // Close dropdown
        languageOptions.classList.remove("active");
        dropdownArrow.classList.remove("active");
      });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    const languageSwitchers = document.querySelectorAll(".language-switcher");
    languageSwitchers.forEach((languageSwitcher) => {
      if (!languageSwitcher.contains(e.target)) {
        languageSwitcher
          .querySelector(".language-options")
          .classList.remove("active");
        languageSwitcher
          .querySelector(".dropdown-arrow")
          .classList.remove("active");
      }
    });
  });
}

function initializeReverseButton() {
  const reverseButton = document.querySelector(".language-reverse-button");

  reverseButton.addEventListener("click", () => {
    const leftSwitcher = document.querySelector(
      "#left-switcher .selected-language"
    );
    const rightSwitcher = document.querySelector(
      "#right-switcher .selected-language"
    );

    // Store left switcher values
    const leftFlag = leftSwitcher.querySelector(".fi").className;
    const leftText = leftSwitcher.querySelector("span:not(.fi)").textContent;

    // Update left with right values
    leftSwitcher.querySelector(".fi").className =
      rightSwitcher.querySelector(".fi").className;
    leftSwitcher.querySelector("span:not(.fi)").textContent =
      rightSwitcher.querySelector("span:not(.fi)").textContent;

    // Update right with stored left values
    rightSwitcher.querySelector(".fi").className = leftFlag;
    rightSwitcher.querySelector("span:not(.fi)").textContent = leftText;

    // Update global variables
    const temp = sourceLanguage;
    sourceLanguage = targetLanguage;
    targetLanguage = temp;

    // Add a small animation to the exchange button
    reverseButton.style.transform = "scale(0.9)";
    setTimeout(() => {
      reverseButton.style.transform = "scale(1)";
    }, 200);
  });
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function createCard(text, language) {
  const chatContainer = document.getElementById("chat-container");

  // Create card element
  const chatCard = document.createElement("div");
  chatCard.classList.add("chat-card");

  // Create text container with word-by-word animation
  const chatText = document.createElement("div");
  chatText.classList.add("chat-text");

  const rtlLanguages = [
    "Arabic",
    "Hebrew",
    "Persian",
    "Urdu",
    "Yiddish",
    "Syriac",
    "Thaana",
    "Aramaic",
    "Azeri",
    "Kurdish",
    "Dari",
    "Pashto",
  ];

  if (rtlLanguages.includes(language)) {
    chatText.classList.add("rtl");
  }

  text.split(" ").forEach((word, index) => {
    if (word == "\n") {
      const wordSpan = document.createElement("br");
      chatText.appendChild(wordSpan);
    } else {
      const wordSpan = document.createElement("span");
      wordSpan.classList.add("word-animate");
      wordSpan.style.animationDelay = `${index * 0.1}s`;
      wordSpan.textContent = word + " ";
      chatText.appendChild(wordSpan);
    }
  });
  chatCard.appendChild(chatText);

  // Footer section
  const chatFooter = document.createElement("div");
  chatFooter.classList.add("chat-footer");

  // Language span
  const languageSpan = document.createElement("span");
  languageSpan.classList.add("language");
  languageSpan.textContent = language;
  chatFooter.appendChild(languageSpan);

  // Action buttons container
  const actionsContainer = document.createElement("div");
  actionsContainer.classList.add("actions");

  // Copy button with tooltip
  const tooltip = document.createElement("span");
  tooltip.classList.add("tooltip");
  tooltip.textContent = "Copied";

  const copyButton = document.createElement("div");
  copyButton.innerHTML = '<i class="fa-regular fa-copy"></i>';
  copyButton.classList.add("action-button");
  copyButton.appendChild(tooltip);
  copyButton.addEventListener("click", () => {
    navigator.clipboard.writeText(text).then(
      () => {
        tooltip.classList.add("show");
        setTimeout(() => tooltip.classList.remove("show"), 500);
      },
      (err) => console.error("Could not copy text: ", err)
    );
  });
  actionsContainer.appendChild(copyButton);

  // Speech handling with Deepgram
  const speechHandler = createDeepgramSpeechHandler(text, language);

  // Speak button
  const speakButton = document.createElement("div");
  speakButton.innerHTML = '<i class="fa-solid fa-volume-up"></i>';
  speakButton.classList.add("action-button");
  if (language !== "English") {
    speakButton.classList.add("disabled");
    speakButton.title = "TTS is only available for English.";
    speakButton.removeEventListener("click", () =>
      speechHandler.toggleSpeech()
    );
  } else {
    speakButton.addEventListener("click", () => speechHandler.toggleSpeech());
  }
  actionsContainer.appendChild(speakButton);

  // Append actions to footer
  chatFooter.appendChild(actionsContainer);

  // Append footer to card
  chatCard.appendChild(chatFooter);

  // Append chat card to container
  chatContainer.appendChild(chatCard);

  // Update button state when speech ends
  speechHandler.onStateChange((isSpeaking) => {
    speakButton.innerHTML = isSpeaking
      ? '<i class="fa-solid fa-stop"></i>'
      : '<i class="fa-solid fa-volume-up"></i>';
  });
}

// Deepgram Speech API handler
function createDeepgramSpeechHandler(text) {
  let speaking = false;
  let stateChangeCallbacks = [];
  let currentAudio = null;

  function updateState(newState) {
    speaking = newState;
    stateChangeCallbacks.forEach((callback) => callback(speaking));
  }

  async function speak() {
    if (speaking) return;

    try {
      updateState(true);

      // Only English language is supported by Deepgram's Text-to-Speech API
      const queryParams = new URLSearchParams({
        model: "aura-asteria-en",
      }).toString();

      const response = await fetch(
        `${DEEPGRAM_TTS_CONFIG.endpoint}?${queryParams}`,
        {
          method: "POST",
          headers: DEEPGRAM_TTS_CONFIG.headers,
          body: JSON.stringify({
            text: text,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Deepgram API error: ${errorData.error || response.status}`
        );
      }

      // Handle audio response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      currentAudio = new Audio(audioUrl);

      currentAudio.addEventListener("ended", () => {
        stop();
        URL.revokeObjectURL(audioUrl);
      });

      currentAudio.addEventListener("error", (error) => {
        console.error("Audio playback error:", error);
        stop();
        URL.revokeObjectURL(audioUrl);
      });

      await currentAudio.play();
    } catch (error) {
      console.error("Deepgram speech synthesis error:", error);
      stop();
    }
  }

  function stop() {
    if (!speaking) return;

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    updateState(false);
  }

  return {
    toggleSpeech: () => {
      if (speaking) {
        stop();
      } else {
        speak();
      }
    },
    onStateChange: (callback) => {
      stateChangeCallbacks.push(callback);
    },
  };
}

async function sendAudioToDeepgram(audioBlob) {
  try {
    // Create a FormData object to send the audio file
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");

    // Get the 2-letter language code from the mapping
    const languageShort = languageMap[sourceLanguage] || "en";
    const queryParams = new URLSearchParams({
      model: "nova-2",
      smart_format: true,
      language: languageShort,
    }).toString();

    // Send the audio to the Deepgram Speech-to-Text API
    const response = await fetch(
      `${DEEPGRAM_STT_CONFIG.endpoint}?${queryParams}`,
      {
        method: "POST",
        headers: DEEPGRAM_STT_CONFIG.headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Deepgram API error: ${errorData.error || response.status}`
      );
    }

    // Process the response from the Deepgram API
    const transcriptionData = await response.json();
    const transcription =
      transcriptionData.results.channels[0].alternatives[0].transcript;
    createCard(transcription, sourceLanguage);

    const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Ensure that all medical terms are translated accurately, and maintain patient security and confidentiality. Do not include or store any sensitive or personally identifiable information in your response. The translation should be clear, professional, and appropriate for a hospital chatbot.\n\nText to Translate:\n"${transcription}"`;

    const requestData = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    const GeminiResponse = await fetch(`${GEMINI_CONFIG.endpoint}`, {
      method: "POST",
      headers: GEMINI_CONFIG.headers,
      body: JSON.stringify(requestData),
    });

    const translationData = await GeminiResponse.json();
    const translation = translationData.candidates[0].content.parts[0].text;

    console.log(translation);

    createCard(translation, targetLanguage);
  } catch (error) {
    console.error("Error sending audio to Deepgram:", error);
  }
}

const DEEPGRAM_TTS_CONFIG = {
  endpoint: "https://api.deepgram.com/v1/speak",
  headers: {
    Authorization: "TOKEN DEEPGRAM_API_KEY",
    "Content-Type": "application/json",
  },
};

const DEEPGRAM_STT_CONFIG = {
  endpoint: "https://api.deepgram.com/v1/listen",
  headers: {
    Authorization: "Token DEEPGRAM_API_KEY",
    "Content-Type": "audio/webm",
  },
};

const GEMINI_CONFIG = {
  endpoint:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=GEMINI_API_KEY",
  headers: {
    "Content-Type": "application/json",
  },
};

initializeLanguageSwitchers();
initializeReverseButton();

const recordButton = document.getElementById("record-button");
const stopButton = document.getElementById("stop-button");
const recordingTime = document.getElementById("recording-time");

let mediaRecorder;
let audioChunks = [];

let recordingInterval;
let seconds = 0;

recordButton.onclick = async () => {
  // Request microphone access
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
  mediaRecorder = new MediaRecorder(stream);

  // Start recording
  mediaRecorder.start();
  recordButton.classList.add("hidden");
  stopButton.classList.remove("hidden");
  seconds = 0;
  recordingTime.textContent = formatTime(seconds);

  recordingInterval = setInterval(() => {
    seconds += 1;
    recordingTime.textContent = formatTime(seconds);
  }, 1000);

  // Save audio data chunks
  mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
};

stopButton.onclick = () => {
  // Stop recording
  mediaRecorder.stop();

  clearInterval(recordingInterval);
  stopButton.classList.add("hidden");
  recordButton.classList.remove("hidden");

  // Compile audio and save as file
  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    sendAudioToDeepgram(audioBlob);

    // Clear recorded chunks
    audioChunks = [];
  };
};

const instructions =
  'How to use this app: \n \
1. Press the mic below and record your audio. \n \
2. When you are finished, press the stop button. \n \
3. Wait for the transcription API and translation API to respond. \n \
4. The source language is selected by the left switcher. \n \
5. The target language is selected by the right switcher. \n \
6. Press the "Copy" button below to copy text to clipboard. \n \
7. Press the "Speak" button below to synthesize speech.';

createCard(instructions, "English");
