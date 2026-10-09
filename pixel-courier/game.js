const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gridSize = 15;
const tileSize = canvas.width / gridSize;

let score = 0;
let lives = 3;
let totalDots = 0;

let mouthAngle = 0.2;
let mouthSpeed = 0.015;
let animFrame = 0;

// Otomatik Oynatma Modu (Yazı Ekrana Yansıtılmaz)
let autoPilot = false;

let pacman = {
    x: 1 * tileSize,
    y: 1 * tileSize,
    speed: 2,
    dirX: 1,
    dirY: 0,
    nextDirX: 1,
    nextDirY: 0
};

let powerMode = false;
let powerTimer = 0;

let map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 3, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 3, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
    [2, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 2],
    [1, 0, 0, 0, 1, 0, 0, 4, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
    [1, 3, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 3, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

let ghosts = [
    { x: 7 * tileSize, y: 6 * tileSize, speed: 2, dirX: 0, dirY: -1, color: "#ff1744", homeX: 7, homeY: 6 },
    { x: 7 * tileSize, y: 8 * tileSize, speed: 2, dirX: 0, dirY: 1, color: "#ff4081", homeX: 7, homeY: 8 }
];

function countDots() {
    totalDots = 0;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (map[r][c] === 0 || map[r][c] === 3) totalDots++;
        }
    }
}
countDots();

window.addEventListener("keydown", (e) => {
    // 1 Tuşu Gizli Olarak Botu Açıp Kapatır
    if (e.key === "1") {
        autoPilot = !autoPilot;
        return;
    }

    if (!autoPilot) {
        if (e.key === "ArrowUp" || e.key === "w") setNextDir(0, -1);
        if (e.key === "ArrowDown" || e.key === "s") setNextDir(0, 1);
        if (e.key === "ArrowLeft" || e.key === "a") setNextDir(-1, 0);
        if (e.key === "ArrowRight" || e.key === "d") setNextDir(1, 0);
    }
});

function setNextDir(dx, dy) {
    pacman.nextDirX = dx;
    pacman.nextDirY = dy;
}

function isTileWall(gridX, gridY) {
    if (gridY < 0 || gridY >= gridSize) return true;
    if (gridX < 0 || gridX >= gridSize) return false;
    return map[gridY][gridX] === 1;
}

// GELİŞTİRİLMİŞ STABİL BOT ALGORİTMASI
function runAutoPilot() {
    let currentGridX = Math.round(pacman.x / tileSize);
    let currentGridY = Math.round(pacman.y / tileSize);

    const dirs = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}];
    let validMoves = [];

    dirs.forEach(d => {
        let nx = currentGridX + d.x;
        let ny = currentGridY + d.y;

        if (!isTileWall(nx, ny)) {
            let evalScore = 0;

            // 1. En Yakın Yem / Güç Yemi Hedefi
            let minDotDist = Infinity;
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    if (map[r][c] === 0 || map[r][c] === 3 || map[r][c] === 4) {
                        let dist = Math.abs(r - ny) + Math.abs(c - nx);
                        if (dist < minDotDist) minDotDist = dist;
                    }
                }
            }
            evalScore -= minDotDist * 15;

            // 2. Geri Dönüşü Cezalandır (Takılmayı / Git-Gel Yapmayı Engeller)
            if (d.x === -pacman.dirX && d.y === -pacman.dirY) {
                evalScore -= 80;
            }

            // 3. Hayalet Tehdit Algılaması
            ghosts.forEach(g => {
                let gX = Math.round(g.x / tileSize);
                let gY = Math.round(g.y / tileSize);
                let distToGhost = Math.abs(gX - nx) + Math.abs(gY - ny);

                if (powerMode) {
                    evalScore -= distToGhost * 30; // Mavi hayaleti kovala
                } else {
                    if (distToGhost <= 1) evalScore -= 1000; // Anında ölüm riski
                    else if (distToGhost <= 3) evalScore -= 400; // Yakın tehdit
                }
            });

            validMoves.push({ dx: d.x, dy: d.y, score: evalScore });
        }
    });

    if (validMoves.length > 0) {
        validMoves.sort((a, b) => b.score - a.score);
        pacman.nextDirX = validMoves[0].dx;
        pacman.nextDirY = validMoves[0].dy;
    }
}

function updatePacman() {
    if (lives <= 0 || totalDots <= 0) return;

    let isCenteredX = (pacman.x % tileSize === 0);
    let isCenteredY = (pacman.y % tileSize === 0);

    if (isCenteredX && isCenteredY) {
        let currentGridX = Math.round(pacman.x / tileSize);
        let currentGridY = Math.round(pacman.y / tileSize);

        if (autoPilot) {
            runAutoPilot();
        }

        if (currentGridX >= 0 && currentGridX < gridSize && currentGridY >= 0 && currentGridY < gridSize) {
            let item = map[currentGridY][currentGridX];
            if (item === 0) {
                map[currentGridY][currentGridX] = 2;
                score += 10;
                totalDots--;
            } else if (item === 3) {
                map[currentGridY][currentGridX] = 2;
                score += 50;
                totalDots--;
                powerMode = true;
                powerTimer = 350;
            } else if (item === 4) {
                map[currentGridY][currentGridX] = 2;
                score += 100;
            }
        }

        if (!isTileWall(currentGridX + pacman.nextDirX, currentGridY + pacman.nextDirY)) {
            pacman.dirX = pacman.nextDirX;
            pacman.dirY = pacman.nextDirY;
        }

        if (isTileWall(currentGridX + pacman.dirX, currentGridY + pacman.dirY)) {
            pacman.dirX = 0;
            pacman.dirY = 0;
        }
    }

    pacman.x += pacman.dirX * pacman.speed;
    pacman.y += pacman.dirY * pacman.speed;

    if (pacman.x <= -tileSize) {
        pacman.x = canvas.width - tileSize;
    } else if (pacman.x >= canvas.width) {
        pacman.x = 0;
    }

    if (powerMode) {
        powerTimer--;
        if (powerTimer <= 0) powerMode = false;
    }
}

function updateGhosts() {
    ghosts.forEach(g => {
        let isCenteredX = (g.x % tileSize === 0);
        let isCenteredY = (g.y % tileSize === 0);

        if (isCenteredX && isCenteredY) {
            let currentGridX = Math.round(g.x / tileSize);
            let currentGridY = Math.round(g.y / tileSize);

            const dirs = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}];
            let validMoves = [];

            dirs.forEach(d => {
                if (d.x !== -g.dirX || d.y !== -g.dirY) {
                    if (!isTileWall(currentGridX + d.x, currentGridY + d.y)) {
                        let targetX = (currentGridX + d.x) * tileSize;
                        let targetY = (currentGridY + d.y) * tileSize;
                        let dist = Math.abs(targetX - pacman.x) + Math.abs(targetY - pacman.y);
                        validMoves.push({ dx: d.x, dy: d.y, dist: dist });
                    }
                }
            });

            if (validMoves.length === 0) {
                dirs.forEach(d => {
                    if (!isTileWall(currentGridX + d.x, currentGridY + d.y)) {
                        validMoves.push({ dx: d.x, dy: d.y, dist: 0 });
                    }
                });
            }

            if (validMoves.length > 0) {
                if (powerMode) {
                    validMoves.sort((a, b) => b.dist - a.dist);
                } else {
                    validMoves.sort((a, b) => a.dist - b.dist);
                }
                g.dirX = validMoves[0].dx;
                g.dirY = validMoves[0].dy;
            }
        }

        g.x += g.dirX * g.speed;
        g.y += g.dirY * g.speed;

        if (g.x <= -tileSize) g.x = canvas.width - tileSize;
        else if (g.x >= canvas.width) g.x = 0;

        let dist = Math.hypot((g.x + tileSize/2) - (pacman.x + tileSize/2), (g.y + tileSize/2) - (pacman.y + tileSize/2));
        if (dist < tileSize * 0.6) {
            if (powerMode) {
                score += 200;
                g.x = g.homeX * tileSize;
                g.y = g.homeY * tileSize;
            } else {
                lives--;
                pacman.x = 1 * tileSize;
                pacman.y = 1 * tileSize;
                pacman.dirX = 1; pacman.dirY = 0;
                pacman.nextDirX = 1; pacman.nextDirY = 0;
            }
        }
    });
}

function updateUI() {
    const scoreElem = document.getElementById("score");
    const livesElem = document.getElementById("lives");
    if (scoreElem) scoreElem.innerText = score;
    if (livesElem) livesElem.innerText = lives;
}

function drawPacman() {
    let centerX = pacman.x + tileSize / 2;
    let centerY = pacman.y + tileSize / 2;
    let radius = tileSize / 2 - 2;

    let rotation = 0;
    if (pacman.dirX === 1) rotation = 0;
    if (pacman.dirX === -1) rotation = Math.PI;
    if (pacman.dirY === 1) rotation = Math.PI / 2;
    if (pacman.dirY === -1) rotation = -Math.PI / 2;

    ctx.fillStyle = "#ffeb3b";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, rotation + mouthAngle, rotation + (Math.PI * 2) - mouthAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fill();
}

function drawGhost(g) {
    let centerX = g.x + tileSize / 2;
    let centerY = g.y + tileSize / 2;
    let radius = tileSize / 2 - 2;

    ctx.fillStyle = powerMode ? "#1a237e" : g.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 2, radius, Math.PI, 0, false);
    
    let bottomY = centerY + radius - 2;
    ctx.lineTo(centerX + radius, bottomY);
    
    let waves = 3;
    let waveWidth = (radius * 2) / waves;
    for (let i = 0; i < waves; i++) {
        let waveOffset = (animFrame % 10 < 5) ? 2 : -2;
        ctx.quadraticCurveTo(
            centerX + radius - (i * waveWidth) - (waveWidth / 2), 
            bottomY + waveOffset, 
            centerX + radius - ((i + 1) * waveWidth), 
            bottomY
        );
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(centerX - 4, centerY - 4, 3, 0, Math.PI * 2);
    ctx.arc(centerX + 4, centerY - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = powerMode ? "#ffeb3b" : "#0d47a1";
    ctx.beginPath();
    ctx.arc(centerX - 4, centerY - 4, 1.5, 0, Math.PI * 2);
    ctx.arc(centerX + 4, centerY - 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    animFrame++;
    if (pacman.dirX !== 0 || pacman.dirY !== 0) {
        mouthAngle += mouthSpeed;
        if (mouthAngle > 0.35 || mouthAngle < 0.05) mouthSpeed = -mouthSpeed;
    }

    updatePacman();
    updateGhosts();
    updateUI();

    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            let item = map[r][c];
            let cx = c * tileSize + tileSize/2;
            let cy = r * tileSize + tileSize/2;

            if (item === 1) {
                ctx.fillStyle = "#1565c0";
                ctx.fillRect(c * tileSize, r * tileSize, tileSize - 1, tileSize - 1);
            } else if (item === 0) {
                ctx.fillStyle = "#ffeb3b";
                ctx.beginPath();
                ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (item === 3) {
                let pulse = Math.sin(animFrame * 0.15) * 2;
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(cx, cy, 5.5 + pulse, 0, Math.PI * 2);
                ctx.fill();
            } else if (item === 4) {
                ctx.fillStyle = "#ff1744";
                ctx.beginPath();
                ctx.arc(cx, cy, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#00e676";
                ctx.fillRect(cx - 1, cy - 8, 2, 4);
            }
        }
    }

    drawPacman();
    ghosts.forEach(g => drawGhost(g));

    if (lives <= 0 || totalDots <= 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = "bold 22px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        
        if (totalDots <= 0) {
            ctx.fillStyle = "#00ff88";
            ctx.fillText("TEBRİKLER! KAZANDIN!", canvas.width / 2, canvas.height / 2);
        } else {
            ctx.fillStyle = "#ff1744";
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
        }
        ctx.fillStyle = "#fff";
        ctx.fillText("Final Skor: " + score, canvas.width / 2, canvas.height / 2 + 28);
        return;
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();