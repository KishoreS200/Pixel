// Dialogue System for NPC interactions
class DialogueSystem {
    constructor() {
        this.active = false;
        this.currentDialogue = null;
        this.currentLine = 0;
        this.displayText = '';
        this.typingTimer = 0;
        this.typingSpeed = 50; // milliseconds per character
        this.showingFullText = false;
        this.npcName = '';
    }
    
    startDialogue(npcType, playerCores = []) {
        const dialogueData = NPC_DEFINITIONS[npcType.toUpperCase()];
        if (!dialogueData) return false;
        
        this.active = true;
        this.currentDialogue = this.processDialogueLines(dialogueData.dialogue, playerCores);
        this.currentLine = 0;
        this.displayText = '';
        this.typingTimer = 0;
        this.showingFullText = false;
        this.npcName = dialogueData.name;
        
        return true;
    }
    
    processDialogueLines(lines, playerCores) {
        // Add context-based dialogue modifications
        return lines.map(line => {
            let processedLine = line;
            
            // Add glitch effect to dialogue if NPC is glitched
            if (this.isGlitchedNPC() && Math.random() < 0.3) {
                processedLine = this.applyGlitchEffect(processedLine);
            }
            
            // Modify based on collected cores
            if (playerCores.length > 0 && processedLine.includes('crystals')) {
                processedLine += ` You have ${playerCores.length} core fragments.`;
            }
            
            return processedLine;
        });
    }
    
    isGlitchedNPC() {
        return this.npcName === 'Elder Mira'; // Only Mira is glitched
    }
    
    applyGlitchEffect(text) {
        // Simple character substitution for glitch effect
        const chars = text.split('');
        const glitchPositions = 2;
        
        for (let i = 0; i < glitchPositions; i++) {
            const pos = Math.floor(Math.random() * chars.length);
            const glitchChar = String.fromCharCode(33 + Math.random() * 94);
            chars[pos] = glitchChar;
        }
        
        return chars.join('');
    }
    
    update(deltaTime) {
        if (!this.active || !this.currentDialogue) return;
        
        if (!this.showingFullText) {
            this.typingTimer += deltaTime;
            
            if (this.typingTimer >= this.typingSpeed) {
                this.typingTimer = 0;
                const fullText = this.currentDialogue[this.currentLine];
                
                if (this.displayText.length < fullText.length) {
                    this.displayText = fullText.substring(0, this.displayText.length + 1);
                } else {
                    this.showingFullText = true;
                }
            }
        }
    }
    
    nextLine() {
        if (!this.showingFullText) {
            // Skip to end of current line
            this.displayText = this.currentDialogue[this.currentLine];
            this.showingFullText = true;
            return true;
        }
        
        // Move to next line
        this.currentLine++;
        
        if (this.currentLine >= this.currentDialogue.length) {
            this.endDialogue();
            return false;
        }
        
        this.displayText = '';
        this.typingTimer = 0;
        this.showingFullText = false;
        
        return true;
    }
    
    endDialogue() {
        this.active = false;
        this.currentDialogue = null;
        this.currentLine = 0;
        this.displayText = '';
        this.npcName = '';
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        const dialogueBox = {
            x: 50,
            y: CONFIG.CANVAS_HEIGHT - 150,
            width: CONFIG.CANVAS_WIDTH - 100,
            height: 100
        };
        
        // Draw dialogue box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(dialogueBox.x, dialogueBox.y, dialogueBox.width, dialogueBox.height);
        
        // Draw border
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(dialogueBox.x, dialogueBox.y, dialogueBox.width, dialogueBox.height);
        
        // Draw NPC name
        ctx.fillStyle = '#00ffff';
        ctx.font = '14px Courier New';
        ctx.fillText(this.npcName + ':', dialogueBox.x + 10, dialogueBox.y + 20);
        
        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Courier New';
        
        // Word wrap text
        const maxWidth = dialogueBox.width - 20;
        const lineHeight = 18;
        const words = this.displayText.split(' ');
        let line = '';
        let y = dialogueBox.y + 45;
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line, dialogueBox.x + 10, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, dialogueBox.x + 10, y);
        
        // Draw continue indicator
        if (this.showingFullText) {
            ctx.fillStyle = '#00ffff';
            ctx.fillText('Press SPACE to continue...', dialogueBox.x + 10, dialogueBox.y + dialogueBox.height - 10);
        }
    }
    
    isActive() {
        return this.active;
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DialogueSystem;
}