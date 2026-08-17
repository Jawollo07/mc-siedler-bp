import { world, system } from "@minecraft/server"; 
import { addTaxes } from "./taxes.js"; 

let dayStarted = false; 
const morningTime = 0; 

system.runInterval(() => { 
    // Holt die aktuelle Uhrzeit des Tages (0 bis 23999)
    const timeNow = world.getTimeOfDay(); 

    // Prüft, ob es früher Morgen ist (Tick 0 bis 499)
    if (timeNow >= morningTime && timeNow < morningTime + 500) { 
        if (!dayStarted) { 
            
            dayStarted = true; // Sperrt die Ausführung für den restlichen Morgen
        } 
    } else { 
        // Setzt den Status zurück, sobald der Morgen vorbei ist
        dayStarted = false; 
    } 
}, 20);
