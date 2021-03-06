var CavernGenerator = new Class({
  
  Implements:Options,

  options:
  {
    seed:undefined,
    width:100,
    height:100,
    tileWidth:4,
    tileHeight:4,
    lavaHeight:10,
    numWaterfalls:4
  },

  initialize:function(options)
  {
    this.setOptions(options);
    this.width = this.options.width;
    this.height = this.options.height;
    this.tiles = [];
    this.lowestPoint = 0;
  },

  generate:function()
  {
    var oldRandom = Math.random;
    if (this.options.seed != undefined)
    {
      Math.seedrandom(this.options.seed);
    }

    // Create filled tile map
    this.tiles = this.makeTilesArray(this.width, this.height, TILE_TYPE_FILLED);
    this.lowestPoint = 0;

    // Call concrete generate function
    this.generateInternal();

    // Find the new lowest
    this.findLowestPoint();

    // Add lava to the map
    this.addLavaToMap();

    // Add water to the map
    this.addWaterToMap();

    // Add grass to the map
    this.addGrassToMap();
    
    // Build final tile map
    var tileMap = [];
    for (var y = 0; y < this.height; ++y)
    {
      var row = [];
      for (var x = 0; x < this.width; ++x)
      {
        row.push(this.tiles[y][x].type);
      }
      tileMap.push(row);
    }

    // Reset random
    Math.random = oldRandom;

    // Build definition
    var cavernDef = {
      width:this.width,
      height:this.height,
      tileWidth:this.options.tileWidth,
      tileHeight:this.options.tileHeight,
      tiles:tileMap
    };
    return cavernDef;
  },

  generateInternal:function()
  {
    throw "Cannot call generate on base cavern generator.  Only invoke on concrete generator classes.";
  },

  createNewTile:function(type)
  {
    return {type:type}
  },

  digTile:function(x,y)
  {
    this.tiles[x][y].type = TILE_TYPE_CLEAR;
  },

  fillRect:function(tiles,baseX,baseY,rectWidth,rectHeight,type)
  {
    var width = tiles.length;
    var height = tiles[0].length;
    for (var x = 0; x < rectWidth; ++x)
    {
      if (baseX+x >= width) continue;
      for (var y = 0; y < rectHeight; ++y)
      {
        if (baseY+y >= height) continue;
        tiles[baseX+x][baseY+y].type = type;
      }
    }
  },

  makeTilesArray:function(width, height, defaultState)
  {
    var tiles = [];
    // Fill initial tiles
    for (var y = 0; y < height; ++y)
    {
      var row = [];
      for (var x = 0; x < width; ++x)
      {
        row.push(this.createNewTile(defaultState));
      }
      tiles.push(row);
    }
    return tiles;
  },  

  findLowestPoint:function()
  {
    this.lowestPoint = 0;
    for (var y = this.height-1; y >= 0; --y)
    {
      for (var x = 0; x < this.width; ++x)
      {
        if (this.tiles[x][y].type == TILE_TYPE_CLEAR)
        {
          this.lowestPoint = y;
          return;
        }
      }
    }
  },

  applyAutomaton:function(tiles, bornList, surviveList, cellSize, iterations)
  {
    var width = tiles.length;
    var height = tiles[0].length;

    // Run automata functions on tiles
    for (var i = 0; i < iterations; ++i)
    {
      var newTiles = this.makeTilesArray(width, height, TILE_TYPE_FILLED);

      for (var x = cellSize; x < width-cellSize; x += cellSize)
      {
        for (var y = cellSize; y < height-cellSize; y += cellSize)
        {
          var numAdjacent = this.getNumAdjacent(tiles,x,y,cellSize);
          var tile = tiles[x][y];

          // Should tile survive?
          var liveCondition = (tile.type == TILE_TYPE_FILLED && surviveList.indexOf(numAdjacent) != -1) ||
                              (tile.type == TILE_TYPE_CLEAR  && bornList.indexOf(numAdjacent) != -1);
          var type = liveCondition ? TILE_TYPE_FILLED : TILE_TYPE_CLEAR;
          this.fillRect(newTiles,x,y,cellSize,cellSize,type);
        }
      }

      // Copy new tile array to old one
      for (var x = 0; x < width; ++x)
      {
        for (var y = 0; y < height; ++y)
        {
          tiles[x][y] = newTiles[x][y];
        }
      }
    }
  },

  getNumAdjacent:function(tiles,x,y,cellSize)
  {
    var width = tiles.length;
    var height = tiles[0].length;

    var leftOutOfBounds  = x-cellSize < 0;
    var rightOutOfBounds = x+cellSize >= width;
    var topOutOfBounds  = y-cellSize < 0;
    var bottomOutOfBounds = y+cellSize >= height;

    var count = 0;
    count += leftOutOfBounds   || topOutOfBounds || tiles[x-cellSize][y-cellSize].type == TILE_TYPE_FILLED;
    count += leftOutOfBounds   || tiles[x-cellSize][y].type == TILE_TYPE_FILLED;
    count += leftOutOfBounds   || bottomOutOfBounds ||  tiles[x-cellSize][y+cellSize].type == TILE_TYPE_FILLED;
    count += topOutOfBounds    || tiles[x][y-cellSize].type == TILE_TYPE_FILLED;
    count += bottomOutOfBounds || tiles[x][y+cellSize].type == TILE_TYPE_FILLED;
    count += rightOutOfBounds  || topOutOfBounds || tiles[x+cellSize][y-cellSize].type == TILE_TYPE_FILLED;
    count += rightOutOfBounds  || tiles[x+cellSize][y].type == TILE_TYPE_FILLED;
    count += rightOutOfBounds  || bottomOutOfBounds || tiles[x+cellSize][y+cellSize].type == TILE_TYPE_FILLED;
    return count;
  },

  addLavaToMap:function()
  {
    // Add basin lava
    for (var y = this.lowestPoint; y >= this.lowestPoint - this.options.lavaHeight && y >= 0; --y)
    {
      for (var x = 0; x < this.width; ++x)
      {
        var tile = this.tiles[x][y];
        if (tile.type == TILE_TYPE_CLEAR)
        {
          tile.type = TILE_TYPE_LAVA;
        }
      }
    }
  },

  addWaterToMap:function()
  {
    // Add waterfalls
    for (var i = 0; i < this.options.numWaterfalls; ++i)
    {
      this.addRandomWaterfall();
    }
  },

  addRandomWaterfall:function()
  {
    // Get a random tile
    var tile = {x:0,y:0};
    var attempts = 0;
    const maxAttempts = 1000;
    do
    {
      tile.x = Math.floor(Math.random()*this.width);
      tile.y = Math.floor(Math.random()*this.height);
    } while(this.tiles[tile.x][tile.y].type != TILE_TYPE_CLEAR && attempts++ < maxAttempts);
    if (attempts >= maxAttempts)
    {
      return;
    }

    // Move up until we find the ceiling
    while (tile.y-1 >= 0 && this.tiles[tile.x][tile.y-1].type == TILE_TYPE_CLEAR) { tile.y -= 1; }

    // Start the water flow
    var waterCreators = [tile];
    while (waterCreators.length > 0)
    {
      var tile = waterCreators.splice(0,1)[0];
      this.tiles[tile.x][tile.y].type = TILE_TYPE_WATER;

      // Can the flow move down?
      if (this.isViableWaterLocation(tile.x,tile.y+1))
      {
        waterCreators.push({x:tile.x,y:tile.y+1});
        continue;
      }

      // If the thing below us is filled, move left and right
      if (this.isTileFilled(tile.x, tile.y+1))
      {
        if (this.isViableWaterLocation(tile.x-1,tile.y))
        {
          waterCreators.push({x:tile.x-1,y:tile.y});
        }
        if (this.isViableWaterLocation(tile.x+1,tile.y))
        {
          waterCreators.push({x:tile.x+1,y:tile.y});
        }
      }
    }
  },

  isViableWaterLocation:function(x,y)
  {
    return this.isOnMap(x, y) && this.tiles[x][y].type == TILE_TYPE_CLEAR
  },

  addGrassToMap:function()
  {
    //Find and destroy all tiles with less than 3 adjacencies
    for (var y = 0; y < this.height; ++y)
    {
      for (var x = 0; x < this.width; ++x)
      {
        var tile = this.tiles[x][y];
        if (tile.type != TILE_TYPE_CLEAR)
        {
          continue;
        }

        if (y-1 >= 0 && this.tiles[x][y-1].type == TILE_TYPE_CLEAR && y+1 < this.height && this.tiles[x][y+1].type == TILE_TYPE_FILLED)
        {
          tile.type = TILE_TYPE_GRASS;
        }
      }
    }
  },

  isOnMap:function(x,y)
  {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  },

  isTileFilled:function(x,y)
  {
    return this.isOnMap(x,y) && this.tiles[x][y].type == TILE_TYPE_FILLED;
  }
});