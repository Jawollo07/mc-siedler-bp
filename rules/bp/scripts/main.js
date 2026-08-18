import {
  world,
  system,
  CommandPermissionLevel,
  CustomCommandParamType
} from "@minecraft/server";
import { ModalFormData, MessageFormData } from "@minecraft/server-ui";
import {
  http,
  HttpRequest,
  HttpRequestMethod,
  HttpHeader
} from "@minecraft/server-net";
import { variables } from "@minecraft/server-admin";

// ============================================================
// CONFIG
// ============================================================

const CONFIG = {
  // API
  API_URL: String(
    variables.get("api_url") || "http://localhost:3000"
  ).replace(/\/$/, ""),

  WEBSITE_URL: String(
    variables.get("website_url") || "http://localhost:3000"
  ).replace(/\/$/, ""),

  // Verification
  VERIFIED_TAG: "rules_verified",
  VERIFIED_PROP: "rules:verified",

  // Formular
  FORM_COOLDOWN_TICKS: 25,
  FORM_RETRY_DELAY_TICKS: 15,
  FORM_FIRST_DELAY_TICKS: 20,
  MAX_FORM_ATTEMPTS: 8,

  // Join
  JOIN_DELAY_TICKS: 80,

  // API
  REQUEST_TIMEOUT: 10,
  VERIFY_REQUEST_COOLDOWN_TICKS: 40,

  // Code
  CODE_LENGTH: 6,

  // Fehlversuche
  MAX_FAILED_ATTEMPTS: 5,
  FAILED_ATTEMPT_WINDOW_TICKS: 20 * 60,

  // Erfolg
  SUCCESS_SOUND: "random.levelup",

  // ==========================================================
  // WICHTIG
  // ==========================================================

  // Nicht verifizierte Spieler werden beim Join gezwungen,
  // das Verifizierungsfenster zu öffnen.
  REQUIRE_VERIFICATION: true,

  // Wenn true, darf jeder Spieler sich selbst mit
  // !unverify /unverify wieder unverifizieren.
  ALLOW_SELF_UNVERIFY: true
};

// ============================================================
// STATE
// ============================================================

const formCooldown = new Map();
const requestCooldown = new Map();
const failedAttempts = new Map();

// ============================================================
// BASIC HELPERS
// ============================================================

function isPlayerValid(player) {
  try {
    return !!player && player.isValid;
  } catch (_) {
    return false;
  }
}

function send(player, message) {
  if (!isPlayerValid(player)) return;

  try {
    player.sendMessage(message);
  } catch (e) {
    console.warn("[RulesVerify] send(): " + e);
  }
}

// ============================================================
// VERIFICATION STATUS
// ============================================================

function isVerified(player) {
  if (!isPlayerValid(player)) return false;

  try {
    if (player.hasTag(CONFIG.VERIFIED_TAG)) {
      return true;
    }

    return player.getDynamicProperty(CONFIG.VERIFIED_PROP) === true;
  } catch (e) {
    console.warn(
      "[RulesVerify] isVerified(" +
      player.name +
      "): " +
      e
    );

    return false;
  }
}

function setVerified(player, value) {
  if (!isPlayerValid(player)) return false;

  try {
    if (value) {
      if (!player.hasTag(CONFIG.VERIFIED_TAG)) {
        player.addTag(CONFIG.VERIFIED_TAG);
      }

      player.setDynamicProperty(
        CONFIG.VERIFIED_PROP,
        true
      );

      return true;
    }

    if (player.hasTag(CONFIG.VERIFIED_TAG)) {
      player.removeTag(CONFIG.VERIFIED_TAG);
    }

    player.setDynamicProperty(
      CONFIG.VERIFIED_PROP,
      false
    );

    return true;
  } catch (e) {
    console.warn(
      "[RulesVerify] setVerified(): " + e
    );

    return false;
  }
}

// ============================================================
// FORM COOLDOWN
// ============================================================

function canOpenForm(player) {
  const now = system.currentTick;
  const last = formCooldown.get(player.name) ?? 0;

  return now - last >= CONFIG.FORM_COOLDOWN_TICKS;
}

function markFormOpened(player) {
  formCooldown.set(
    player.name,
    system.currentTick
  );
}

// ============================================================
// API COOLDOWN
// ============================================================

function canSendVerifyRequest(player) {
  const now = system.currentTick;
  const last =
  requestCooldown.get(player.name) ?? 0;

  if (
    now - last <
    CONFIG.VERIFY_REQUEST_COOLDOWN_TICKS
  ) {
    return false;
  }

  requestCooldown.set(
    player.name,
    now
  );

  return true;
}

// ============================================================
// FAILED ATTEMPTS
// ============================================================

function getFailedAttemptData(player) {
  const now = system.currentTick;
  const data = failedAttempts.get(player.name);

  if (!data) {
    const fresh = {
      count: 0,
      firstTick: now
    };

    failedAttempts.set(
      player.name,
      fresh
    );

    return fresh;
  }

  if (
    now - data.firstTick >
    CONFIG.FAILED_ATTEMPT_WINDOW_TICKS
  ) {
    data.count = 0;
    data.firstTick = now;
  }

  return data;
}

function registerFailedAttempt(player) {
  const data = getFailedAttemptData(player);

  data.count++;

  failedAttempts.set(
    player.name,
    data
  );

  return data;
}

function hasTooManyFailedAttempts(player) {
  return (
    getFailedAttemptData(player).count >=
    CONFIG.MAX_FAILED_ATTEMPTS
  );
}

function resetFailedAttempts(player) {
  failedAttempts.delete(player.name);
}

// ============================================================
// UI / INFO
// ============================================================

function sendWebsiteInfo(player) {
  send(
    player,
    "§e§l========== Verifizierung =========="
  );

  send(
    player,
    "§71. Öffne die Website:"
  );

  send(
    player,
    "§b§n" + CONFIG.WEBSITE_URL
  );

  send(
    player,
    "§72. Hole dort deinen 6-stelligen Code."
  );

  send(
    player,
    "§73. Tippe im Spiel §f!verify§7."
  );

  send(
    player,
    "§74. Gib den Code im Formular ein."
  );

  send(
    player,
    "§e§l==================================="
  );
}

function sendStatus(player) {
  send(
    player,
    "§e§l======= Verification ======="
  );

  send(
    player,
    "§7Status: " +
    (isVerified(player)
    ? "§averifiziert"
    : "§cnicht verifiziert")
  );

  send(
    player,
    "§7Website: §b" +
    CONFIG.WEBSITE_URL
  );

  send(
    player,
    "§7Befehl: §f!verify"
  );

  send(
    player,
    "§7Unverify: §f!unverify"
  );

  send(
    player,
    "§e§l============================"
  );
}

function playSuccess(player) {
  try {
    player.playSound(
      CONFIG.SUCCESS_SOUND,
      {
        volume: 0.8,
        pitch: 1.0
      }
    );
  } catch (_) {}
}

function forceCloseChat(player) {
  try {
    player.runCommand("damage @s 0");
  } catch (_) {}
}

// ============================================================
// UNVERIFY
// ============================================================

function unverify(player) {
  if (!isPlayerValid(player)) {
    return;
  }

  if (!CONFIG.ALLOW_SELF_UNVERIFY) {
    send(
      player,
      "§cSelbstständiges Unverify ist deaktiviert."
    );
    return;
  }

  if (!isVerified(player)) {
    send(
      player,
      "§eDu bist bereits nicht verifiziert."
    );
    return;
  }

  const success = setVerified(
    player,
    false
  );

  if (!success) {
    send(
      player,
      "§cFehler beim Entfernen der Verifizierung."
    );

    return;
  }

  resetFailedAttempts(player);

  send(
    player,
    "§aDu wurdest erfolgreich unverifiziert."
  );

  send(
    player,
    "§cDu musst dich erneut verifizieren, um weiterspielen zu können."
  );

  console.warn(
    "[RulesVerify] " +
    player.name +
    " hat sich selbst unverifiziert."
  );

  // Direkt wieder das Verifizierungsfenster öffnen
  system.runTimeout(() => {
    if (!isPlayerValid(player)) return;

    openStartDialog(player);
  }, 20);
}

// ============================================================
// API
// ============================================================

async function verifyCodeOnServer(
  code,
  playerName
) {
  const req = new HttpRequest(
    CONFIG.API_URL + "/api/verify"
  );

  req.method =
  HttpRequestMethod.Post;

  req.headers = [
    new HttpHeader(
      "Content-Type",
      "application/json"
    )
  ];

  req.body = JSON.stringify({
    code: code,
    player: playerName
  });

  req.timeout =
  CONFIG.REQUEST_TIMEOUT;

  try {
    const response =
    await http.request(req);

    if (response.status !== 200) {
      return {
        success: false,
        message:
        "Server-Fehler (HTTP " +
        response.status +
        ")"
      };
    }

    if (!response.body) {
      return {
        success: false,
        message:
        "Leere Server-Antwort"
      };
    }

    try {
      return JSON.parse(
        response.body
      );
    } catch (_) {
      return {
        success: false,
        message:
        "Ungültige Server-Antwort"
      };
    }
  } catch (error) {
    console.warn(
      "[RulesVerify] HTTP-Fehler: " +
      error
    );

    return {
      success: false,
      networkError: true,
      message:
      "Verbindung zur API fehlgeschlagen"
    };
  }
}

// ============================================================
// CODE VALIDATION
// ============================================================

function normalizeCode(value) {
  return String(value ?? "")
  .replace(/\D/g, "")
  .slice(0, CONFIG.CODE_LENGTH);
}

// ============================================================
// CODE FORM
// ============================================================

function openCodeForm(
  player,
  attempt = 1
) {
  if (!isPlayerValid(player)) {
    return;
  }

  if (isVerified(player)) {
    send(
      player,
      "§aDu bist bereits verifiziert."
    );
    return;
  }

  if (
    attempt === 1 &&
    !canOpenForm(player)
  ) {
    send(
      player,
      "§7Bitte kurz warten..."
    );
    return;
  }

  if (attempt === 1) {
    markFormOpened(player);
    forceCloseChat(player);
  }

  if (hasTooManyFailedAttempts(player)) {
    send(
      player,
      "§cZu viele falsche Codes."
    );

    send(
      player,
      "§7Bitte warte kurz und versuche es später erneut."
    );

    return;
  }

  const delay =
  attempt === 1
  ? CONFIG.FORM_FIRST_DELAY_TICKS
  : CONFIG.FORM_RETRY_DELAY_TICKS;

  system.runTimeout(() => {
    if (!isPlayerValid(player)) {
      return;
    }

    const form =
    new ModalFormData()
    .title(
      "Regeln bestätigen"
    )
    .textField(
      "6-stelliger Code von der Website",
      "z.B. 482719"
    );

    form.show(player)
      .then(async (response) => {
        if (!isPlayerValid(player)) {
          return;
        }

        if (response.canceled) {
          const reason =
          response.cancelationReason ||
          "Unbekannt";

      if (
        reason === "UserBusy" &&
        attempt <
        CONFIG.MAX_FORM_ATTEMPTS
      ) {
        openCodeForm(
          player,
          attempt + 1
        );

        return;
      }

      send(
        player,
        "§cDu musst dich verifizieren."
      );

      sendWebsiteInfo(player);

      return;
        }

        const raw =
        response.formValues?.[0];

        const code =
        normalizeCode(raw);

        if (
          code.length !==
          CONFIG.CODE_LENGTH
        ) {
          send(
            player,
            "§cDer Code muss genau §f6 Zahlen §centhalten."
          );

          // Formular erneut öffnen
          system.runTimeout(() => {
            if (
              isPlayerValid(player) &&
              !isVerified(player)
            ) {
              openCodeForm(
                player,
                1
              );
            }
          }, 10);

          return;
        }

        if (
          !canSendVerifyRequest(
            player
          )
        ) {
          send(
            player,
            "§7Bitte kurz warten..."
          );

          return;
        }

        send(
          player,
          "§7Code wird geprüft..."
        );

        const result =
        await verifyCodeOnServer(
          code,
          player.name
        );

        if (!isPlayerValid(player)) {
          return;
        }

        if (result.success) {
          setVerified(
            player,
            true
          );

          resetFailedAttempts(
            player
          );

          playSuccess(player);

          send(
            player,
            "§a§l✓ Code akzeptiert!"
          );

          send(
            player,
            "§aDu bist jetzt verifiziert."
          );

          send(
            player,
            "§7Viel Spaß auf dem Server!"
          );

          console.warn(
            "[RulesVerify] " +
            player.name +
            " wurde verifiziert."
          );

          return;
        }

        const failed =
        registerFailedAttempt(
          player
        );

        send(
          player,
          "§c✗ " +
          (result.message ||
          "Code ungültig")
        );

        send(
          player,
          "§7Fehlversuche: §f" +
          failed.count +
          "§7/" +
          CONFIG.MAX_FAILED_ATTEMPTS
        );

        if (
          failed.count <
          CONFIG.MAX_FAILED_ATTEMPTS
        ) {
          send(
            player,
            "§7Hole einen neuen Code:"
          );

          send(
            player,
            "§b" +
            CONFIG.WEBSITE_URL
          );

          system.runTimeout(() => {
            if (
              isPlayerValid(player) &&
              !isVerified(player)
            ) {
              openCodeForm(
                player,
                1
              );
            }
          }, 20);
        } else {
          send(
            player,
            "§cZu viele Fehlversuche."
          );

          send(
            player,
            "§7Bitte warte kurz."
          );
        }
      })
      .catch((error) => {
        console.warn(
          "[RulesVerify] Formularfehler: " +
          error
        );

        if (
          attempt <
          CONFIG.MAX_FORM_ATTEMPTS
        ) {
          openCodeForm(
            player,
            attempt + 1
          );
        } else {
          send(
            player,
            "§cFormular konnte nicht geöffnet werden."
          );

          sendWebsiteInfo(player);
        }
      });
  }, delay);
}

// ============================================================
// START DIALOG
// ============================================================

function openStartDialog(player) {
  if (!isPlayerValid(player)) {
    return;
  }

  if (isVerified(player)) {
    return;
  }

  forceCloseChat(player);

  system.runTimeout(() => {
    if (
      !isPlayerValid(player) ||
      isVerified(player)
    ) {
      return;
    }

    const dialog =
    new MessageFormData()
    .title(
      "§cVerifizierung erforderlich"
    )
    .body(
      "Du musst verifiziert sein, um auf diesem Server spielen zu können.\n\n" +
      "Hole deinen 6-stelligen Code hier:\n\n" +
      CONFIG.WEBSITE_URL +
      "\n\n" +
      "Anschließend kannst du den Code eingeben."
    )
    .button1("Code eingeben")
    .button2("Website");

    dialog.show(player)
    .then((response) => {
      if (!isPlayerValid(player)) {
        return;
      }

      if (
        response.canceled ||
        response.selection === 1
      ) {
        send(
          player,
          "§cDu musst dich verifizieren."
        );

        sendWebsiteInfo(player);

        // Erneut anzeigen
        system.runTimeout(() => {
          if (
            isPlayerValid(player) &&
            !isVerified(player)
          ) {
            openStartDialog(player);
          }
        }, 40);

        return;
      }

      openCodeForm(
        player,
        1
      );
    })
    .catch((error) => {
      console.warn(
        "[RulesVerify] Startdialog Fehler: " +
        error
      );

      if (
        isPlayerValid(player) &&
        !isVerified(player)
      ) {
        sendWebsiteInfo(player);

        system.runTimeout(() => {
          if (
            isPlayerValid(player) &&
            !isVerified(player)
          ) {
            openCodeForm(
              player,
              1
            );
          }
        }, 40);
      }
    });
  }, 15);
}

// ============================================================
// JOIN
// ============================================================

world.afterEvents.playerSpawn.subscribe(
  (event) => {
    if (!event.initialSpawn) {
      return;
    }

    const player =
    event.player;

    system.runTimeout(() => {
      if (!isPlayerValid(player)) {
        return;
      }

      // Bereits verifiziert
      if (isVerified(player)) {
        send(
          player,
          "§7Willkommen zurück – du bist verifiziert."
        );

        return;
      }

      // ======================================================
      // NICHT VERIFIZIERT
      // ======================================================

      if (CONFIG.REQUIRE_VERIFICATION) {
        send(
          player,
          "§c§lDu musst dich verifizieren, um spielen zu können."
        );

        sendWebsiteInfo(player);

        openStartDialog(player);

        return;
      }

      // Optionaler Fallback ohne Zwang
      sendWebsiteInfo(player);
    }, CONFIG.JOIN_DELAY_TICKS);
  }
);

// ============================================================
// CHAT COMMANDS
// ============================================================
system.beforeEvents.startup.subscribe((event) => {
  const registry = event.customCommandRegistry;

  // ==========================================================
  // /verify
  // ==========================================================

  registry.registerCommand(
    {
      name: "rules:verify",
      description: "Öffnet das Verifizierungsformular.",
      permissionLevel:
      CommandPermissionLevel.Any,
      cheatsRequired: false
    },
    (origin) => {
      const player = origin.sourceEntity;

      if (
        !player ||
        player.typeId !== "minecraft:player"
      ) {
        return;
      }

      system.run(() => {
        if (isVerified(player)) {
          send(
            player,
            "§aDu bist bereits verifiziert."
          );
          return;
        }

        openCodeForm(player, 1);
      });

      return {
        status: 0
      };
    }
  );

  // ==========================================================
  // /rules
  // ==========================================================

  registry.registerCommand(
    {
      name: "rules:rules",
      description: "Zeigt Informationen zur Verifizierung.",
      permissionLevel:
      CommandPermissionLevel.Any,
      cheatsRequired: false
    },
    (origin) => {
      const player = origin.sourceEntity;

      if (
        !player ||
        player.typeId !== "minecraft:player"
      ) {
        return;
      }

      system.run(() => {
        sendWebsiteInfo(player);
      });

      return {
        status: 0
      };
    }
  );

  // ==========================================================
  // /website
  // ==========================================================

  registry.registerCommand(
    {
      name: "rules:website",
      description: "Zeigt die Verifizierungs-Webseite.",
      permissionLevel:
      CommandPermissionLevel.Any,
      cheatsRequired: false
    },
    (origin) => {
      const player = origin.sourceEntity;

      if (
        !player ||
        player.typeId !== "minecraft:player"
      ) {
        return;
      }

      system.run(() => {
        send(
          player,
          "§b§n" + CONFIG.WEBSITE_URL
        );
      });

      return {
        status: 0
      };
    }
  );

  // ==========================================================
  // /verifyinfo
  // ==========================================================

  registry.registerCommand(
    {
      name: "rules:verifyinfo",
      description: "Zeigt deinen Verifizierungsstatus.",
      permissionLevel:
      CommandPermissionLevel.Any,
      cheatsRequired: false
    },
    (origin) => {
      const player = origin.sourceEntity;

      if (
        !player ||
        player.typeId !== "minecraft:player"
      ) {
        return;
      }

      system.run(() => {
        sendStatus(player);
      });

      return {
        status: 0
      };
    }
  );

  // ==========================================================
  // /unverify
  // ==========================================================

  registry.registerCommand(
    {
      name: "rules:unverify",
      description: "Entfernt deine Verifizierung.",
      permissionLevel:
      CommandPermissionLevel.Any,
      cheatsRequired: false
    },
    (origin) => {
      const player = origin.sourceEntity;

      if (
        !player ||
        player.typeId !== "minecraft:player"
      ) {
        return;
      }

      system.run(() => {
        unverify(player);
      });

      return {
        status: 0
      };
    }
  );

  console.warn(
    "[RulesVerify] Custom Commands registriert."
  );
});
// ============================================================
// SCRIPT EVENT
// ============================================================

system.afterEvents.scriptEventReceive.subscribe(
  (event) => {
    if (
      event.id !==
      "rules:verify"
    ) {
      return;
    }

    const player =
    event.sourceEntity;

    if (
      !player ||
      player.typeId !==
      "minecraft:player"
    ) {
      return;
    }

    if (!isVerified(player)) {
      openCodeForm(
        player,
        1
      );
    }
  }
);

// ============================================================
// CLEANUP
// ============================================================

system.runInterval(() => {
  const onlinePlayers =
  new Set(
    world
    .getPlayers()
    .map((player) => player.name)
  );

  for (const name of formCooldown.keys()) {
    if (!onlinePlayers.has(name)) {
      formCooldown.delete(name);
    }
  }

  for (const name of requestCooldown.keys()) {
    if (!onlinePlayers.has(name)) {
      requestCooldown.delete(name);
    }
  }

  for (const name of failedAttempts.keys()) {
    if (!onlinePlayers.has(name)) {
      failedAttempts.delete(name);
    }
  }
}, 20 * 60);

// ============================================================
// STARTUP
// ============================================================

console.warn(
  "[RulesVerify] =================================="
);

console.warn(
  "[RulesVerify] RulesVerify geladen"
);

console.warn(
  "[RulesVerify] Website: " +
  CONFIG.WEBSITE_URL
);

console.warn(
  "[RulesVerify] API: " +
  CONFIG.API_URL
);

console.warn(
  "[RulesVerify] REQUIRE_VERIFICATION: " +
  CONFIG.REQUIRE_VERIFICATION
);

console.warn(
  "[RulesVerify] ALLOW_SELF_UNVERIFY: " +
  CONFIG.ALLOW_SELF_UNVERIFY
);

console.warn(
  "[RulesVerify] =================================="
);
