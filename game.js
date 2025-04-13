const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set canvas to full window size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game state
const player = {
    worldX: 0,
    worldY: 0,
    screenX: canvas.width / 2,  // Center of screen (target position)
    screenY: canvas.height / 2,
    displayX: canvas.width / 2, // Actual drawn position (may differ during camera movement)
    displayY: canvas.height / 2,
    radius: 15,
    speed: 5
};

const camera = {
    offsetX: 0,
    offsetY: 0,
    deadzoneWidth: 400,  // Horizontal deadzone (centered)
    deadzoneHeight: 300, // Vertical deadzone (centered)
    lerpSpeed: 0.1       // Smooth follow speed (0.1 = 10% per frame)
};

// Set player's on-screen position (center of the canvas)
player.screenX = canvas.width / 2;
player.screenY = canvas.height / 2;

const bullets = [];
const enemies = [];
let score = 0;

// Mouse position (for shooting direction)
let mouseX = 0;
let mouseY = 0;

// Keyboard state tracking
const keys = {};

window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

// Update camera logic
function handlePlayerMovement() {
    // Reset velocity
    let dx = 0;
    let dy = 0;

    if (keys["ArrowUp"] || keys["w"]) dy = -player.speed;
    if (keys["ArrowDown"] || keys["s"]) dy = player.speed;
    if (keys["ArrowLeft"] || keys["a"]) dx = -player.speed;
    if (keys["ArrowRight"] || keys["d"]) dx = player.speed;

    // Store previous positions
    const prevWorldX = player.worldX;
    const prevWorldY = player.worldY;

    // Calculate proposed new positions
    const proposedWorldX = player.worldX + dx;
    const proposedWorldY = player.worldY + dy;

    // Calculate where this would put the player on screen
    const proposedScreenX = proposedWorldX + camera.offsetX;
    const proposedScreenY = proposedWorldY + camera.offsetY;

    // Deadzone boundaries (centered)
    const deadzoneLeft = (canvas.width - camera.deadzoneWidth) / 2;
    const deadzoneRight = deadzoneLeft + camera.deadzoneWidth;
    const deadzoneTop = (canvas.height - camera.deadzoneHeight) / 2;
    const deadzoneBottom = deadzoneTop + camera.deadzoneHeight;

    // Check if movement would take player outside deadzone
    let shouldMove = true;
    let cameraMoved = false;

    if (proposedScreenX < deadzoneLeft) {
        camera.offsetX += deadzoneLeft - proposedScreenX;
        cameraMoved = true;
    } else if (proposedScreenX > deadzoneRight) {
        camera.offsetX += deadzoneRight - proposedScreenX;
        cameraMoved = true;
    }

    if (proposedScreenY < deadzoneTop) {
        camera.offsetY += deadzoneTop - proposedScreenY;
        cameraMoved = true;
    } else if (proposedScreenY > deadzoneBottom) {
        camera.offsetY += deadzoneBottom - proposedScreenY;
        cameraMoved = true;
    }

    // Only update player position if either:
    // 1. Camera moved (player reached edge of deadzone)
    // 2. Player is still within deadzone after movement
    const newScreenX = proposedWorldX + camera.offsetX;
    const newScreenY = proposedWorldY + camera.offsetY;

    if (cameraMoved || 
        (newScreenX >= deadzoneLeft && newScreenX <= deadzoneRight &&
         newScreenY >= deadzoneTop && newScreenY <= deadzoneBottom)) {
        player.worldX = proposedWorldX;
        player.worldY = proposedWorldY;
    }

    player.displayX = player.worldX + camera.offsetX;
    player.displayY = player.worldY + camera.offsetY;
}

// Track mouse position
window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

// Shoot on click
window.addEventListener("click", () => {
    // Player's current DISPLAY position (where they're actually drawn)
    const playerDisplayX = player.worldX + camera.offsetX;
    const playerDisplayY = player.worldY + camera.offsetY;
    
    // Calculate vector from player's display position to mouse
    const dx = mouseX - playerDisplayX;
    const dy = mouseY - playerDisplayY;
    
    // Normalize the vector
    const distance = Math.sqrt(dx * dx + dy * dy);
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;
    
    // Create bullet at player's exact world position
    bullets.push({
        worldX: player.worldX,  // Exact world position
        worldY: player.worldY,
        radius: 5,
        color: "#FFFF00",
        speed: 10,
        dx: normalizedDx * 10,
        dy: normalizedDy * 10
    });
});

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Update world position
        bullet.worldX += bullet.dx;
        bullet.worldY += bullet.dy;
        
        // Calculate screen position for distance checks
        const screenX = bullet.worldX + camera.offsetX;
        const screenY = bullet.worldY + camera.offsetY;
        
        // Remove bullets that go off-screen
        if (screenX < -50 || screenX > canvas.width + 50 || 
            screenY < -50 || screenY > canvas.height + 50) {
            bullets.splice(i, 1);
        }
    }
}

function updateEnemies() {
    enemies.forEach(enemy => {
        const angle = Math.atan2(
            player.worldY - enemy.worldY,
            player.worldX - enemy.worldX
        );
        enemy.worldX += Math.cos(angle) * enemy.speed;
        enemy.worldY += Math.sin(angle) * enemy.speed;
    });
}

function spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 500;
    enemies.push({
        worldX: player.worldX + Math.cos(angle) * distance,
        worldY: player.worldY + Math.sin(angle) * distance,
        radius: 20,
        color: "#FF0000",
        speed: 2
    });
}

function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            // Use world coordinates for collision
            const dist = Math.hypot(
                bullet.worldX - enemy.worldX,
                bullet.worldY - enemy.worldY
            );
            
            if (dist < bullet.radius + enemy.radius) {
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                score += 10;
                break;
            }
        }
    }
}

function drawPlayer() {
    // Update player's actual display position
    player.displayX = player.worldX + camera.offsetX;
    player.displayY = player.worldY + camera.offsetY;
    
    ctx.beginPath();
    ctx.arc(player.displayX, player.displayY, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#00FF00";
    ctx.fill();
}

function drawBullets() {
    bullets.forEach(bullet => {
        // Convert world position to screen position
        const screenX = bullet.worldX + camera.offsetX;
        const screenY = bullet.worldY + camera.offsetY;
        
        ctx.beginPath();
        ctx.arc(screenX, screenY, bullet.radius, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color;
        ctx.fill();
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        const screenX = enemy.worldX + camera.offsetX;
        const screenY = enemy.worldY + camera.offsetY;
        ctx.beginPath();
        ctx.arc(screenX, screenY, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();
    });
}

function drawScore() {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 20, 30);
}

function drawGrid() {
    const gridSize = 40;
    const lineColor = "rgba(255, 255, 255, 0.2)";

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    // Calculate visible grid bounds based on camera
    const startX = Math.floor(-camera.offsetX / gridSize) * gridSize;
    const startY = Math.floor(-camera.offsetY / gridSize) * gridSize;

    // Vertical lines
    for (let x = startX; x < startX + canvas.width + gridSize; x += gridSize) {
        const screenX = x + camera.offsetX;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y < startY + canvas.height + gridSize; y += gridSize) {
        const screenY = y + camera.offsetY;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
        ctx.stroke();
    }
}

function drawDeadzone() {
    ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
        (canvas.width - camera.deadzoneWidth) / 2,
        (canvas.height - camera.deadzoneHeight) / 2,
        camera.deadzoneWidth,
        camera.deadzoneHeight
    );
}

function drawAimLine() {
    // Draw line from actual player position to mouse
    ctx.beginPath();
    ctx.moveTo(player.displayX, player.displayY);
    ctx.lineTo(mouseX, mouseY);
    ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
    ctx.stroke();
    
    // Display positions
    ctx.fillStyle = "white";
    ctx.fillText(`World: (${player.worldX.toFixed(1)}, ${player.worldY.toFixed(1)})`, 20, 60);
    ctx.fillText(`Screen: (${player.displayX.toFixed(1)}, ${player.displayY.toFixed(1)})`, 20, 90);
}

function gameLoop() {
    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid (background)
	drawGrid();
	drawDeadzone();
	drawAimLine();

    // Update game state
    handlePlayerMovement();
    updateBullets();
    updateEnemies();
    checkCollisions();

    // Spawn enemies randomly
    if (Math.random() < 0.02) spawnEnemy();

    // Draw everything
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawScore();

    // Repeat
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
