window.onload = setup;

var width = 500;
var height = 500;

var money = 0;
var totalMoney = 0;

var canvas;
var ctx;

var fields = [];

var nextMulch = 0;
var tileSizes = [50,25,20,10,5,4,2,1];

var maxGrowth = 15;

var mulch = 0;

var activeField;
var growthBonus = 0;

var currentPosition = 0;
var unlockedFields = 1;

var growthBasePrice = 10;

var speedBasePrice = 50;
var sizeBasePrice = 75;
var tileBasePrice = 150;

var tickBasePrice = 5;

var growthRateMultiplier = 1.2;
var tickBaseMultiplier = 1.2;
var mowerRateMultiplier = 2.5;
var mowerSizeMultiplier = 1.5;
var tileSizeMultiplier = 3.5;
var currentlyPrestiging = false;

var skillTree = [];
var skillTreeUpgrades = [];
var skillTreePaths = [];


function Area(name, multiplierBuff, initialBuff, baseColor, grownColor, machineColor, unlockPrice, message, value, machineName, hmm){
    
    this.baseColor = baseColor;
    this.grownColor = grownColor;
    this.message = message;
    this.whyDoIDoThis = hmm;
    this.upgrades = [
        new Upgrade("machineSpeed", speedBasePrice*initialBuff*1.5, mowerRateMultiplier+multiplierBuff, function(){activeField.machineSpeed++}, "%tpt% tiles/tick", "%name% Speed", function(){return activeField.machineSpeed<20;}),
        new Upgrade("machineSize", sizeBasePrice*initialBuff*1.5, mowerSizeMultiplier+multiplierBuff, function(){if(activeField.machineWidth==activeField.machineHeight){activeField.machineWidth++}else{activeField.machineHeight++}activeField.machineX=0;activeField.machineY=0;}, "%w%x%h%", "%name% Size", function(){console.log(activeField.machineHeight + " " + tileSizes[activeField.tileSize]); return activeField.machineHeight < height/tileSizes[activeField.tileSize];}),
        new Upgrade("tileSize", tileBasePrice*initialBuff*1.5, tileSizeMultiplier+multiplierBuff, function(){activeField.tileSize=Math.min(activeField.tileSize+1,tileSizes.length-1);activeField.regenerate();}, "%sz%x%sz%", "Tile Size", function(){return activeField.tileSize < tileSizes.length - 1;}),
        new Upgrade("growthRate", growthBasePrice*initialBuff*1.5, growthRateMultiplier+multiplierBuff, function(){activeField.growthAmount+=2;}, "%gr% growth/tick", "Growth Rate", function(){return activeField.growthAmount<60;}),
        new Upgrade("tickRate", tickBasePrice*initialBuff*1.5, tickBaseMultiplier+multiplierBuff, function(){activeField.tickRate=Math.max(1,Math.floor(activeField.tickRate*0.9));}, "%ms% ms", "Tick Rate", function(){return activeField.tickRate > 4;})
    ];
    
    this.machineName = machineName;
    this.superExtra = 0;
    this.superTicks = 0;
    this.name = name;
    this.lastTick;
    this.growthAmount = 4;
    this.machineX = 0;
    this.machineY = 0;
    this.value=value;
    this.machineWidth = 1;
    this.machineHeight = 1;
    this.machineSpeed = 1;
    this.machineGoingUp = false;
    this.machineColor = machineColor;
    this.totalMowed = 0;
    this.field = [];
    this.tileSize = 0;
    this.tickRate = 1000;
    this.unlockPrice=unlockPrice;
    this.generateField = function(){
        for(var i = 0; i < width/tileSizes[this.tileSize]; i++){
            this.field.push(new Array());
            for(var j = 0; j < height/tileSizes[this.tileSize]; j++){
                this.field[i].push(Math.floor(Math.random()*maxGrowth));
                updateTile(this, i, j);
            }
        }
        this.lastTick = +new Date();
    }
    this.unlockField = function(){
        if(money >= this.unlockPrice){
            money -= this.unlockPrice;
            unlockedFields++;
            currentPosition = unlockedFields-1;
            activeField = this;
            this.generateField();
            tick(this);
        }
    }
    
    this.getUpgradeText = function(upgrade){
        return upgrade.displayText.replace("%tpt%", this.machineSpeed).replace("%w%", this.machineWidth).replace("%h%", this.machineHeight).replace(/%sz%/g, width/tileSizes[this.tileSize]).replace("%ms%", this.tickRate).replace("%gr%", this.growthAmount);
    }
    
    this.regenerate = function(){
        this.field = [];
        this.generateField();
    }
    
    this.machineTick = function(){
        var currentTime = +new Date();
        var timeDifference = currentTime - this.lastTick;
        this.lastTick = currentTime;
        this.superExtra += timeDifference - this.tickRate;
        if(this.superExtra > this.tickRate * 5){
            this.superTicks += Math.floor(this.superExtra / 5 / this.tickRate);
            this.superExtra %= this.tickRate  * 5;
        }
        for(var i  = 0; i < this.machineSpeed; i++){
            var cX = this.machineX;
            var cY = this.machineY;
            for(var x = 0; x < this.machineWidth; x++){
                for(var y = 0; y < this.machineHeight; y++){
                    var tX = x + cX;
                    var tY = y + cY;
                    if(this.field[tX][tY] >= 5){
                        this.field[tX][tY]=0;
                        money+=this.value*(this.superTicks>0?5:1)*(1+mulch/100)/2;
                        totalMoney+=this.value*(this.superTicks>0?5:1)*(1+mulch/100)/2;
                        this.superTicks = Math.max(0, this.superTicks-1);
                        this.totalMowed++;
                        
                        
                    }
                    if(activeField == this)
                            updateTile(this, tX,tY);
                }
            }
            if(activeField == this)
                document.getElementById("totalMowed").innerHTML = this.message + this.totalMowed;
            updateMoney();
            if(this.goingUp){
                if(this.machineY > 0){
                    this.machineY--;
                }else{
                    if(this.machineX >= width / tileSizes[this.tileSize]-this.machineWidth){
                        this.goingUp=false;
                        this.machineX = 0;
                        this.machineY = 0;
                    }else{
                        this.machineX=Math.min(this.machineX + this.machineWidth, width / tileSizes[this.tileSize]-this.machineWidth);
                        this.goingUp = false;
                    }
                }
            }else{
                if(this.machineY < height / tileSizes[this.tileSize]-this.machineHeight){
                    this.machineY++;
                }else{
                    if(this.machineX >= width / tileSizes[this.tileSize]-this.machineWidth){
                        this.goingUp=false;
                        this.machineX = 0;
                        this.machineY = 0;
                    }else{
                        this.machineX=Math.min(this.machineX + this.machineWidth, width / tileSizes[this.tileSize]-this.machineWidth);
                        this.goingUp = true;
                    }
                }
            }
            if(activeField==this){
                ctx.fillStyle = this.machineColor;
                ctx.fillRect(this.machineX *tileSizes[this.tileSize],this.machineY*tileSizes[this.tileSize],tileSizes[this.tileSize]*this.machineWidth,tileSizes[this.tileSize]*this.machineHeight);
            }
            
        }
    }
    
    this.growthTick = function(){

        var x = Math.floor(Math.random()*width/tileSizes[this.tileSize]);
        var y = Math.floor(Math.random()*height/tileSizes[this.tileSize]);
        if(this.field[x][y]<maxGrowth){
            
            this.field[x][y]=Math.min(maxGrowth, this.field[x][y]+1+growthBonus);
        }
        if(activeField == this)
            updateTile(this, x, y);
    }
    
}

function Upgrade(name, price, multiplier, onBuy, displayText, displayName, canBuy){
    this.name = name;
    this.displayName = displayName;
    this.price = price;
    this.multiplier = multiplier;
    this.displayText = displayText;
    this.buyUpgrade = function(){
        if(canBuy() && money >= this.price){
            money -= this.price;
            onBuy();
            this.price = Math.floor(this.price*this.multiplier);
            updateText();
            updateMoney();
        }
    }
    this.canBuy=canBuy;
}

function SkillUpgrade(name, basePrice, onBuy, description, maxLevel){
    this.name = name;
    this.basePrice = basePrice;
    this.currentPrice = basePrice;
    this.onBuy = onBuy;
    this.description = description;
    this.maxLevel = maxLevel;
    this.level = 0;
    
    this.buy = function(){
        if(this.level < this.maxLevel && mulch >= this.currentPrice){
            mulch -= this.currentPrice;
            this.level++;
            this.currentPrice = Math.floor(this.basePrice * Math.pow(1.5, this.level));
            this.onBuy();
            updateSkillTree();
            updatePrestigeValues();
        }
    }
    
    this.canBuy = function(){
        return this.level < this.maxLevel;
    }
}

function SkillPath(name){
    this.name = name;
    this.tiers = [];
    this.selectedUpgrades = [];
}

function SkillTier(tierNumber){
    this.tierNumber = tierNumber;
    this.upgrades = [];
}


function upgrade(name){
    getUpgrade(activeField, name).buyUpgrade();
}

function getField(name){
    for(var i = 0; i < fields.length; i++){
        if(fields[i].name == name)
            return fields[i];
    }
    return fields[0];
}

function getUpgrade(field, name){
    for(var i = 0; i < field.upgrades.length; i++){
        if(field.upgrades[i].name==name){
            return field.upgrades[i];
        }
    }
    return field.upgrades[0];
}

function next(){
    if(currentPosition < unlockedFields - 1){
        currentPosition++;
        activeField = fields[currentPosition];
        updateText();
        for(var x = 0; x < activeField.field.length; x++){
            for(var y = 0; y < activeField.field[0].length; y++){
                updateTile(activeField, x, y);
            }
        }
    }
    document.getElementById("desc").innerHTML = activeField.whyDoIDoThis;
    
}

function previous(){
    if(currentPosition > 0){
        currentPosition--;
        activeField = fields[currentPosition];
        updateText();
        for(var x = 0; x < activeField.field.length; x++){
            for(var y = 0; y < activeField.field[0].length; y++){
                updateTile(activeField, x, y);
            }
        }
    }
    document.getElementById("desc").innerHTML = activeField.whyDoIDoThis;
}

function unlockNext(){
    if(unlockedFields < fields.length){
        fields[unlockedFields].unlockField();
        if(unlockedFields == fields.length){
            document.getElementById("unlock").innerHTML = "All Fields Unlocked";
        }else{
            document.getElementById("unlock").innerHTML = "Unlock " + fields[unlockedFields].name + " Field for $" + fields[unlockedFields].unlockPrice;
        }
        updateText();
        
    }
    document.getElementById("desc").innerHTML = activeField.whyDoIDoThis;
}

function updateText(){
    var field = activeField;
    var name = field.name;
    for(var j = 0; j < field.upgrades.length; j++){
        
        var upgrade = field.upgrades[j];
        document.getElementById("upgrade" + upgrade.name).innerHTML = (upgrade.canBuy() ? "Upgrade " + upgrade.displayName.replace("%name%", activeField.machineName) + " - $" + upgrade.price : "MAXED");
        document.getElementById("text" + upgrade.name).innerHTML = field.getUpgradeText(upgrade);
        
        
    }
    document.getElementById("totalMowed").innerHTML = activeField.message + activeField.totalMowed;


}

function buyUpgrade(upgradeName){
    getUpgrade(activeField,upgradeName).buyUpgrade();
}

function tick(field){
    for(var i = 0; i < field.growthAmount; i++){
        
        field.growthTick();
        
    }
    
    field.machineTick();
    if(!currentlyPrestiging){
        setTimeout(function(){tick(field);}, field.tickRate);
    }
    
}



function updateMoney(){
    document.getElementById("money").innerHTML = "$" + Math.floor(money);
    if(activeField.superTicks > 0){
        document.getElementById("superTicks").innerHTML = "Super Ticks: " + activeField.superTicks;
    }else{
        document.getElementById("superTicks").innerHTML = "";
    }
}

function addFields(){
    fields.push(new Area("Grass", 0, 1, [0,210,0], [0,130,0], "rgb(255,0,0)", 0, "Total Grass Mowed: ", 1, "Lawnmower", "Wow this lawn grows fast."));
    fields.push(new Area("Dirt", 0.15, 10, [175, 175, 175], [122, 96, 0], "rgb(68, 130, 206)", 150000, "Total Dirt Vacuumed: ", 5, "Vacuum", "Vroom, vroom"));
    fields.push(new Area("Weed", 0.25, 50, [239, 233, 112], [145,233,124], "rgb(255,127,0)", 1500000, "Total Weeds Whacked: ", 20, "Weed Whacker", "Good thing you don't need to keep replacing the trimming stuff."));
    fields.push(new Area("Pumpkin", 0.35, 100, [181, 155, 105], [255, 188, 61], "rgb(119, 119, 119)", 15000000, "Total Pumpkins Thwacked: ", 50, "Harvester", "For when you can't find the hippogriff."));
    fields.push(new Area("Tree", 0.45, 500, [122, 81, 0], [54, 109, 0], "rgb(97, 175, 191)", 150000000, "Total Trees Chopped: ", 100, "Chainsaw", "No, it's only for trees."));
    fields.push(new Area("Fire", 0.55, 1000, [255,0,0],[255,255,0],"rgb(0,0,255)", 1500000000, "Total Fires Extinguished: ", 200, "Wave", "I'm impressed that you know how to create a wave out of thin air."));
    fields.push(new Area("Stone", 0.65, 5000, [255,255,255],[124, 124, 124],"rgb(122, 73, 33)", 15000000000, "Total Stone Mined: ", 500, "Wooden Pickaxe", "I swear this one's not a reference to anything."));
    fields.push(new Area("Iron", 0.75, 10000, [124, 124, 124],[221, 206, 193],"rgb(100, 100, 100)", 150000000000, "Total Iron Mined: ", 1000, "Stone Pickaxe", "Nor is this one."));
    fields.push(new Area("Diamond", 0.85, 50000, [124, 124, 124], [124, 239, 228], "rgb(221, 206, 193)", 1500000000000, "Total Diamonds Mined: ", 2000, "Iron Pickaxe", "Ok - last one I swear."));
    fields.push(new Area("Gold", 0.95, 100000, [138, 202, 216], [211, 176, 0], "rgb(143, 158, 139)", 15000000000000, "Total Gold Panned: ", 5000, "Pan", "There's no rush ;)"));
    fields.push(new Area("People", 0.65, 5000, [255, 67, 50], [255, 211, 168], "rgb(100, 100, 100)", 150000000000000, "Total People Killed: ", 10000, "Terminator", "I'll be back"));
}

function setup(){
    canvas = document.getElementById("lawn");
    ctx = canvas.getContext('2d');
    
    addFields();
    activeField = fields[0];
    activeField.generateField();
    ctx.fillStyle = "green";
    tick(activeField);
    updateText(activeField);
    setupSkillTree();
    setInterval(updatePrestigeValues, 500);
    
    // Passive clear map ability - runs every 5 seconds
    setInterval(function(){
        // Find the clearMapPassive upgrade
        var clearMapUpgrade = null;
        for(var p = 0; p < skillTreePaths.length; p++){
            for(var t = 0; t < skillTreePaths[p].tiers.length; t++){
                for(var u = 0; u < skillTreePaths[p].tiers[t].upgrades.length; u++){
                    var upgrade = skillTreePaths[p].tiers[t].upgrades[u];
                    if(upgrade.name === "clearMapPassive"){
                        clearMapUpgrade = upgrade;
                        break;
                    }
                }
                if(clearMapUpgrade) break;
            }
            if(clearMapUpgrade) break;
        }
        
        if(clearMapUpgrade && clearMapUpgrade.level > 0 && activeField){
            for(var x = 0; x < activeField.field.length; x++){
                for(var y = 0; y < activeField.field[0].length; y++){
                    if(activeField.field[x][y] >= 5){
                        activeField.field[x][y] = 0;
                        money += activeField.value * (activeField.superTicks > 0 ? 5 : 1) * (1 + mulch/100) / 2;
                        totalMoney += activeField.value * (activeField.superTicks > 0 ? 5 : 1) * (1 + mulch/100) / 2;
                        activeField.totalMowed++;
                        updateTile(activeField, x, y);
                    }
                }
            }
            document.getElementById("totalMowed").innerHTML = activeField.message + activeField.totalMowed;
            updateMoney();
        }
    }, 5000);
}

function updatePrestigeValues(){
    calculateGrowthBonus();
    nextMulch =Math.floor(Math.max(0, Math.pow(Math.max(0, totalMoney/10 - 7500), 0.575)-mulch));
    document.getElementById("mulch").innerHTML = "Mulch: " + mulch;
    document.getElementById("prestigeButton").innerHTML = "Prestige for " + nextMulch + " Mulch";
    document.getElementById("valueBonus").innerHTML = "Current Value Bonus: " + mulch + "%";
    document.getElementById("growthBonus").innerHTML = "Current Growth Bonus: " + (growthBonus+1) + "x";
}

function calculateGrowthBonus(){
    growthBonus = Math.floor(Math.log(Math.max(1,mulch))/Math.log(15));
}

function attemptPrestige(){
    if(nextMulch > 0){
        currentlyPrestiging = true;
        setTimeout(reset, 2000);
        
    }
}

function reset(){
    mulch += nextMulch;
    money = 0;
    totalMoney = 0;
    
    
    fields = [];
    addFields();
    activeField = fields[0];
    activeField.generateField();
    ctx.fillStyle = "green";
    currentPosition = 0;
    unlockedFields = 1;
    currentlyPrestiging = false;
    
    // Reset width and height but keep skill tree upgrades
    width = 500;
    height = 500;
    canvas.width = width;
    canvas.height = height;
    
    tick(activeField);
    updateText(activeField);
}

function updateTile(field, x, y){
    
    var ratio = field.field[x][y]/maxGrowth;
    
    var r = field.baseColor[0]+Math.round(ratio*(field.grownColor[0]-field.baseColor[0]));
    var g = field.baseColor[1]+Math.round(ratio*(field.grownColor[1]-field.baseColor[1]));
    var b = field.baseColor[2]+Math.round(ratio*(field.grownColor[2]-field.baseColor[2]));
    
    ctx.fillStyle = "rgb("+r+","+g+","+b+")";
    ctx.fillRect(x*tileSizes[field.tileSize], y*tileSizes[field.tileSize], tileSizes[field.tileSize], tileSizes[field.tileSize]);
    
}

function setupSkillTree(){
    // Speed Path
    var speedPath = new SkillPath("⚡ Speed Path");
    
    var speedTier1 = new SkillTier(1);
    speedTier1.upgrades.push(new SkillUpgrade("speedBase", 15, function(){
        for(var i = 0; i < fields.length; i++){
            fields[i].machineSpeed += 2;
        }
        updateText();
    }, "Machine Speed +2", 10));
    speedPath.tiers.push(speedTier1);
    
    var speedTier2 = new SkillTier(2);
    speedTier2.upgrades.push(new SkillUpgrade("speedBoost1", 30, function(){
        for(var i = 0; i < fields.length; i++){
            fields[i].machineSpeed += 3;
        }
        updateText();
    }, "Speed Boost I +3", 10));
    speedTier2.upgrades.push(new SkillUpgrade("speedBoost2", 40, function(){
        for(var i = 0; i < fields.length; i++){
            fields[i].tickRate = Math.max(1, Math.floor(fields[i].tickRate * 0.92));
        }
        updateText();
    }, "Faster Ticks -8%", 10));
    speedPath.tiers.push(speedTier2);
    
    var speedTier3 = new SkillTier(3);
    speedTier3.upgrades.push(new SkillUpgrade("speedBoost3", 60, function(){
        for(var i = 0; i < fields.length; i++){
            fields[i].machineSpeed += 5;
        }
        updateText();
    }, "Speed Boost II +5", 10));
    speedTier3.upgrades.push(new SkillUpgrade("speedBoost4", 80, function(){
        for(var i = 0; i < fields.length; i++){
            fields[i].tickRate = Math.max(1, Math.floor(fields[i].tickRate * 0.88));
        }
        updateText();
    }, "Ultra Fast -12%", 10));
    speedTier3.upgrades.push(new SkillUpgrade("speedBoost5", 100, function(){
        for(var i = 0; i < fields.length; i++){
            fields[i].machineSpeed += 3;
            fields[i].tickRate = Math.max(1, Math.floor(fields[i].tickRate * 0.95));
        }
        updateText();
    }, "Hyper Drive", 10));
    speedPath.tiers.push(speedTier3);
    
    skillTreePaths.push(speedPath);
    
    // Power Path
    var powerPath = new SkillPath("💪 Power Path");
    
    var powerTier1 = new SkillTier(1);
    powerTier1.upgrades.push(new SkillUpgrade("sizeBase", 20, function(){
        for(var i = 0; i < fields.length; i++){
            if(fields[i].machineWidth === fields[i].machineHeight){
                fields[i].machineWidth += 1;
            } else {
                fields[i].machineHeight += 1;
            }
        }
        updateText();
    }, "Machine Size +1", 15));
    powerPath.tiers.push(powerTier1);
    
    var powerTier2 = new SkillTier(2);
    powerTier2.upgrades.push(new SkillUpgrade("powerBoost1", 35, function(){
        for(var i = 0; i < fields.length; i++){
            if(fields[i].machineWidth === fields[i].machineHeight){
                fields[i].machineWidth += 2;
            } else {
                fields[i].machineHeight += 2;
            }
        }
        updateText();
    }, "Power Boost I +2", 10));
    powerTier2.upgrades.push(new SkillUpgrade("powerBoost2", 50, function(){
        width = Math.min(width + 100, 1000);
        height = Math.min(height + 100, 1000);
        canvas.width = width;
        canvas.height = height;
        for(var i = 0; i < fields.length; i++){
            if(fields[i].field.length > 0){
                fields[i].regenerate();
            }
        }
    }, "Map Size +100", 7));
    powerPath.tiers.push(powerTier2);
    
    var powerTier3 = new SkillTier(3);
    powerTier3.upgrades.push(new SkillUpgrade("powerBoost3", 70, function(){
        for(var i = 0; i < fields.length; i++){
            if(fields[i].machineWidth === fields[i].machineHeight){
                fields[i].machineWidth += 3;
            } else {
                fields[i].machineHeight += 3;
            }
        }
        updateText();
    }, "Power Boost II +3", 8));
    powerTier3.upgrades.push(new SkillUpgrade("powerBoost4", 90, function(){
        width = Math.min(width + 150, 1000);
        height = Math.min(height + 150, 1000);
        canvas.width = width;
        canvas.height = height;
        for(var i = 0; i < fields.length; i++){
            if(fields[i].field.length > 0){
                fields[i].regenerate();
            }
        }
    }, "Mega Map +150", 5));
    powerTier3.upgrades.push(new SkillUpgrade("powerBoost5", 120, function(){
        for(var i = 0; i < fields.length; i++){
            fields[i].machineSpeed += 2;
            fields[i].machineWidth += 2;
        }
        updateText();
    }, "All Power +2", 8));
    powerPath.tiers.push(powerTier3);
    
    skillTreePaths.push(powerPath);
    
    // Growth Path
    var growthPath = new SkillPath("🌱 Growth Path");
    
    var growthTier1 = new SkillTier(1);
    growthTier1.upgrades.push(new SkillUpgrade("growthBase", 25, function(){
        for(var i = 0; i < fields.length; i++){
            fields[i].growthAmount += 3;
        }
        updateText();
    }, "Growth Rate +3", 10));
    growthPath.tiers.push(growthTier1);
    
    var growthTier2 = new SkillTier(2);
    growthTier2.upgrades.push(new SkillUpgrade("growthBoost1", 45, function(){
        for(var i = 0; i < fields.length; i++){
            fields[i].growthAmount += 5;
        }
        updateText();
    }, "Growth Boost I +5", 10));
    growthTier2.upgrades.push(new SkillUpgrade("growthBoost2", 55, function(){
        for(var i = 0; i < fields.length; i++){
            fields[i].growthAmount += 3;
            fields[i].machineSpeed += 1;
        }
        updateText();
    }, "Balanced Growth", 10));
    growthPath.tiers.push(growthTier2);
    
    var growthTier3 = new SkillTier(3);
    growthTier3.upgrades.push(new SkillUpgrade("growthBoost3", 75, function(){
        for(var i = 0; i < fields.length; i++){
            fields[i].growthAmount += 8;
        }
        updateText();
    }, "Growth Boost II +8", 8));
    growthTier3.upgrades.push(new SkillUpgrade("clearMapPassive", 150000, function(){
        // Passive ability - no action needed
    }, "Auto-Clear (every 5s)", 999));
    growthTier3.upgrades.push(new SkillUpgrade("moneyBoostPassive", 75000, function(){
        money += totalMoney * 0.5;
        totalMoney += totalMoney * 0.5;
        updateMoney();
    }, "Money Injection +50%", 999));
    growthPath.tiers.push(growthTier3);
    
    skillTreePaths.push(growthPath);
}

function openSkillTree(){
    document.getElementById("skillTreeOverlay").style.display = "flex";
    updateSkillTree();
}

function closeSkillTree(){
    document.getElementById("skillTreeOverlay").style.display = "none";
}

function updateSkillTree(){
    document.getElementById("skillTreeMulch").innerHTML = "Mulch: " + mulch;
    
    var content = document.getElementById("skillTreeContent");
    content.innerHTML = "";
    content.style.display = "grid";
    content.style.gridTemplateColumns = "1fr 1fr 1fr";
    content.style.gap = "20px";
    
    for(var p = 0; p < skillTreePaths.length; p++){
        var path = skillTreePaths[p];
        
        var pathColumn = document.createElement("div");
        pathColumn.className = "skillPathColumn";
        pathColumn.style.display = "flex";
        pathColumn.style.flexDirection = "column";
        pathColumn.style.gap = "15px";
        
        var pathName = document.createElement("div");
        pathName.className = "skillPathName";
        pathName.innerHTML = path.name;
        pathColumn.appendChild(pathName);
        
        for(var t = 0; t < path.tiers.length; t++){
            var tier = path.tiers[t];
            
            var tierDiv = document.createElement("div");
            tierDiv.className = "skillTier";
            
            var tierLabel = document.createElement("div");
            tierLabel.className = "skillTierLabel";
            tierLabel.innerHTML = "Tier " + tier.tierNumber;
            tierDiv.appendChild(tierLabel);
            
            for(var u = 0; u < tier.upgrades.length; u++){
                var skill = tier.upgrades[u];
                var canBuy = skill.canBuy() && mulch >= skill.currentPrice;
                var isLocked = (t > 0 && path.selectedUpgrades[t-1] === undefined);
                
                var skillNode = document.createElement("div");
                skillNode.className = "skillNode";
                
                if(isLocked){
                    skillNode.classList.add("locked");
                }
                if(skill.level > 0){
                    skillNode.classList.add("purchased");
                }
                
                var info = document.createElement("div");
                info.className = "skillNodeInfo";
                
                var name = document.createElement("div");
                name.className = "skillNodeName";
                name.innerHTML = skill.name.replace(/([A-Z])/g, ' $1').trim();
                
                var desc = document.createElement("div");
                desc.className = "skillNodeDesc";
                desc.innerHTML = skill.description;
                
                var cost = document.createElement("div");
                cost.className = "skillNodeCost";
                cost.innerHTML = "Cost: " + Math.floor(skill.currentPrice) + " Mulch";
                
                var level = document.createElement("div");
                level.className = "skillNodeLevel";
                level.innerHTML = "Level: " + skill.level + "/" + skill.maxLevel;
                
                info.appendChild(name);
                info.appendChild(desc);
                info.appendChild(cost);
                info.appendChild(level);
                
                var button = document.createElement("button");
                button.className = "skillNodeButton";
                button.disabled = !canBuy || isLocked;
                button.innerHTML = canBuy ? "Buy" : (skill.level >= skill.maxLevel ? "Max" : "Locked");
                button.onclick = (function(skillUpgrade, pathIndex, tierIndex){
                    return function(){
                        skillUpgrade.buy();
                        skillTreePaths[pathIndex].selectedUpgrades[tierIndex] = skillUpgrade.name;
                        updateSkillTree();
                    };
                })(skill, p, t);
                
                skillNode.appendChild(info);
                skillNode.appendChild(button);
                
                tierDiv.appendChild(skillNode);
            }
            
            pathColumn.appendChild(tierDiv);
        }
        
        content.appendChild(pathColumn);
    }
}