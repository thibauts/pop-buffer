/*
 * TODO
 * - crack prevention
 * - vertex attributes
 */
var computeBoundingBox = require('vertices-bounding-box');
var quantizeVertices = require('quantize-vertices');
var rescaleVertices = require('rescale-vertices');


function encode(cells, positions, maxLevel) {
  var boundingBox = computeBoundingBox(positions);

  var buckets = buildBuckets(cells, positions, maxLevel);
  var levels = buildLevels(buckets, positions);

  return {
    bounds: boundingBox,
    levels: levels
  };
}


function decode(pb) {
  var cells = [];
  var positions = [];

  var levels = pb.levels;
  var bounds = pb.bounds;

  for(var i=0; i<levels.length; i++) {
    cells = cells.concat(levels[i].cells);
    positions = positions.concat(levels[i].positions);
  }

  if(cells.length !== 0 && positions.length !== 0) {
    var level = levels.length;
    positions = quantizeVertices(positions, level, bounds);
    positions = rescaleVertices(positions, bounds);
  }

  return {
    cells: cells,
    positions: positions
  };
}


function buildLevels(buckets, positions) {
  var indexLookup = {};
  var lastIndex = 0;
  var levels = new Array(buckets.length);

  /*
   * Reindex positions, putting them in the level where they first appear
   */
  for(var i=0; i<buckets.length; i++) {
    var cells = buckets[i];
    var level = {
      cells: new Array(cells.length),
      positions: []
    };

    for(var j=0; j<cells.length; j++) {
      var cell = cells[j];
      var newCell = new Array(cell.length);

      for(var k=0; k<cell.length; k++) {
        var index = cell[k];

        if(indexLookup[index] === undefined) {
          level.positions.push(positions[index]);
          indexLookup[index] = lastIndex;
          lastIndex++;
        }

        newCell[k] = indexLookup[index];
      }

      level.cells[j] = newCell;
    }

    levels[i] = level;
  }

  return levels;
}


function buildBuckets(cells, positions, maxLevel) {
  var cellLevels = new Array(cells.length);

  /*
   * Cells that still have level -1 at the end of the process will never pop, ie. they will be
   * degenerate even at the highest quantization level.
   */
  for(var i=0; i<cells.length; i++) {
    cellLevels[i] = -1;
  }

  /*
   * Go from the maximum quantization level down to 1 and update the pop level
   * of each cell that is still not degenerate at this quantization level.
   */
  for(var level=maxLevel; level>0; level--) {

    // Quantize the positions at "level" bits precision
    var quantizedPositions = quantizeVertices(positions, level);

    // Extract the indices of non-degenerate cells at this level
    var cellIndices = listNonDegenerateCells(cells, quantizedPositions);

    // Update the pop level for the set of cells that are still not degenerate
    for(var i=0; i<cellIndices.length; i++) {
      cellLevels[cellIndices[i]] = level;
    }
  }

  var buckets = new Array(maxLevel);

  // Initialize each bucket to an empty array
  for(var i=0; i<maxLevel; i++) {
    buckets[i] = [];
  }

  /*
   * Finally, put each cell into its pop level bucket, 
   * ignoring never-popping cells
   */
  for(var i=0; i<cellLevels.length; i++) {
    var cellLevel = cellLevels[i];
    if(cellLevel === -1) {
      continue;
    }
    buckets[cellLevel - 1].push(cells[i]);
  }

  return buckets;
}


function extractCells(cells, indices) {
  var extracted = new Array(indices.length);
  for(var i=0; i<indices.length; i++) {
    extracted[i] = cells[indices[i]];
  }
  return extracted;
}


function listNonDegenerateCells(cells, positions) {
  var nonDegenerateCells = [];

  for(var i=0; i<cells.length; i++) {
    var degenerate = isTriangleDegenerate([
      positions[cells[i][0]],
      positions[cells[i][1]],
      positions[cells[i][2]],
      ]);

    if(!degenerate) {
      nonDegenerateCells.push(i);
    }
  }

  return nonDegenerateCells;
}


function isTriangleDegenerate(tri) {
  return arrayEqual(tri[0], tri[1]) || arrayEqual(tri[1], tri[2]) || arrayEqual(tri[2], tri[0]);
}


function arrayEqual(a, b) {
  if(a.length !== b.length) {
    return false;
  }

  for(var i=0; i<a.length; i++) {
    if(a[i] !== b[i]) return false;
  }
  return true;
}


module.exports = {
  encode: encode,
  decode: decode
};