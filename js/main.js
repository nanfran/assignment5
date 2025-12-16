/*
File: main.js
GUI Assignment: One-Line Scrabble with Drag-and-Drop
Nancy Vi, UMass Lowell Computer Science, Nancy_Vi@student.uml.edu
Copyright (c) 2025 by Nancy. All rights reserved.

Description: This is the js file for assignment 5, it contains the behavior of the page that 
handles the tile validation, initializing the board, score keeping, tile movement, and word submission. 
This assignment uses the jQuery library for DOM manipulation and the jQuery UI library for handling drag-
and-drop interactions.
Updated by NV on December 17, 2025 at 11:59 PM

*/

// Global variables
let totalScore = 0; 
let boardState = [];
let tileInventory = {}; 

// Board pieces
const BOARD_SIZE = 15;
const SPECIAL_TILES = [
    { index: 2, type: 'DW' },
    { index: 6, type: 'DL' },
    { index: 8, type: 'DL' },
    { index: 12, type: 'DW' }
];

// Initializes game board and sets up event listeners
$(document).ready(function() {
    if (typeof ScrabbleTiles === 'undefined') {
        return; 
    }

    resetTileInventory();
    initializeBoard();
    dealNewTiles(7); 

    $('#submit-word').on('click', submitWord);
    $('#restart-game').on('click', restart);
});

// Uses Jesse M. Heines' data file for the original distribution 
function resetTileInventory() {
    tileInventory = {};
    for (const letter in ScrabbleTiles) {
        tileInventory[letter] = ScrabbleTiles[letter]["original-distribution"];
    }
}

// Makes the one-line board and adds jQuery UI droppable behavior on each square 
function initializeBoard() {
    const $board = $('#scrabble-board');
    $board.empty();
    boardState = new Array(BOARD_SIZE).fill(null);

    for (let i = 0; i < BOARD_SIZE; i++) {
        const specialInfo = SPECIAL_TILES.find(b => b.index === i);
        
        let specialClass = '';
        let specialText = '';

        if (specialInfo) {
            specialClass = specialInfo.type;
            
            // Defines special tiles on the board
            if (specialInfo.type === 'DW') {
                specialText = 'DOUBLE WORD SCORE';
            } else if (specialInfo.type === 'DL') {
                specialText = 'DOUBLE LETTER SCORE';
            }
        }

        const $square = $('<div>')
            .addClass(`board-square ${specialClass}`)
            .attr('data-index', i)
            .html(`<span>${specialText}</span>`)
            .droppable({
                accept: '.tile',
                drop: handleTileDrop,
                tolerance: 'pointer' 
        });

        $board.append($square);
    }
}

// Creates tiles by detrmining image path and sets up jQuery UI draggable 
// behavior on each tile
function createTile(letter, value, tileId) {
    let tileFileName;

    if (letter === '_') {
        tileFileName = 'Scrabble_Tile_Blank.jpg';
    } else {
        tileFileName = `Scrabble_Tile_${letter}.jpg`;
    }

    const fullPath = `graphics_data/${tileFileName}`;

    const $tile = $('<div>')
        .addClass('tile')
        .attr({
            'id': tileId,
            'data-letter': letter,
            'data-value': value
        })
        .append($('<img>').addClass('tile-image').attr('src', fullPath).attr('alt', `Scrabble Tile ${letter}`))
        .draggable({
            revert: 'invalid', 
            revertDuration: 0,
            cursor: 'grabbing',
            cursorAt: { left: 30, top: 30 },
            snap: '.board-square, #tile-rack', 
            snapMode: 'inner',
            
            // Start logic for when tile is first dragged
            start: function(event, ui) {
                const $tile = $(this);
                const $originalParent = $tile.parent();

                $tile.data('original-parent', $originalParent);

                $tile.css('z-index', 9999); 

                if ($originalParent.hasClass('board-square')) {
                    const originalIndex = parseInt($originalParent.attr('data-index'));

                    boardState[originalIndex] = null;

                    $originalParent.find('span').show();
                    
                    $originalParent.append(
                        $('<div>').addClass('tile-placeholder').attr('id', 'temp-placeholder')
                    );

                    $tile.data('tile-data', {
                        letter: $tile.attr('data-letter'),
                        value: parseInt($tile.attr('data-value'))
                    });
                }
            },

            // Stop logic for when drag endss
            stop: function(event, ui) {
                $(this).css('z-index', 10);
                
                const $tile = $(this);
                const $originalParent = $tile.data('original-parent');
                const $currentParent = $tile.parent();

                if ($originalParent.hasClass('board-square')) {
                    const originalIndex = parseInt($originalParent.attr('data-index'));
                    const $placeholder = $originalParent.find('#temp-placeholder');

                    if ($currentParent.is($originalParent) && boardState[originalIndex] === null) {
                        
                        $placeholder.remove();
                        $originalParent.find('span').hide();

                        boardState[originalIndex] = $tile.data('tile-data');

                        $tile.css({ top: '0', left: '0', position: 'relative' });

                    } else if ($placeholder.length) {
                        $placeholder.remove();
                    }
                }
                if ($currentParent.is('#tile-rack')) {
                    $tile.css({ top: '', left: '', position: 'relative' });
                }
                updateScore();
            }
        });
    
    return $tile;
}

// Logic for when a tile is dropped onto a game board square. Updates the board state
function handleTileDrop(event, ui) {
    const $square = $(this);
    const squareIndex = parseInt($square.attr('data-index'));
    const $tile = ui.draggable;

    if ($square.find('.tile').length > 0) {
        if ($square.find('.tile').get(0) !== $tile.get(0)) {
            return; 
        }
    }

    // If placement is not valid, square reverts to previous location
    if (!isPlacementValid(squareIndex)) {
        return false; 
    }

    $square.find('#temp-placeholder').remove(); 
    $square.find('span').hide(); 

    $tile.css({
        top: '0',
        left: '0',  
        position: 'relative' 
    }).appendTo($square);

    boardState[squareIndex] = {
        letter: $tile.attr('data-letter'),
        value: parseInt($tile.attr('data-value'))
    };

    updateScore();
}


// Ensures that tiles are placed next to another tile on the game board
function isPlacementValid(index) {
    const placedTilesCount = boardState.filter(tile => tile !== null).length;

    if (placedTilesCount === 0) {
        return true; 
    }
    
    const isAdjacentLeft = (index > 0 && boardState[index - 1] !== null);
    const isAdjacentRight = (index < BOARD_SIZE - 1 && boardState[index + 1] !== null);

    let startIndex = boardState.findIndex(tile => tile !== null);
    let endIndex = boardState.findLastIndex(tile => tile !== null);

    if (index < startIndex || index > endIndex) {
        return isAdjacentLeft || isAdjacentRight;
    } 

    return isAdjacentLeft || isAdjacentRight;
}

// Submits the current word on the board. Updates total score, clears board, 
// and deals new tiles
function submitWord() {
    updateScore();  
    const wordScore = parseInt($('#word-score-value').text());
    if (boardState.filter(tile => tile !== null).length === 0) {
        return;
    }
    
    if (wordScore === 0) {
        alert("Word must be continuous. Please try again!");
        return;
    }
    
    totalScore += wordScore;
    $('#total-score-value').text(totalScore);
    clearBoard();

    const tilesToDeal = 7 - $('#tile-rack .tile').length;
    dealNewTiles(tilesToDeal); 

    alert(`Word successfully submitted! Good job`);
}

// After  aword is submitted, deal enough tiles to refill rack to 7 letters
// from the remaining tiles avaiable in hte tile inventory
function dealNewTiles(count) {
    const $rack = $('#tile-rack');
    const availableLetters = [];

    for (const letter in tileInventory) {
        const currentCount = tileInventory[letter];

        for (let i = 0; i < currentCount; i++) {
            availableLetters.push(letter);
        }
    }
    
    const tilesToDraw = Math.min(count, availableLetters.length);
    
    if (tilesToDraw === 0) { 
        return; 
    }
    
    for (let i = 0; i < tilesToDraw; i++) {
        const randomIndex = Math.floor(Math.random() * availableLetters.length);
        const letter = availableLetters.splice(randomIndex, 1)[0];

        tileInventory[letter]--;

        const tileId = `tile-${letter}-${Date.now()}-${i}`;
        const value = ScrabbleTiles[letter]["value"]; 
        const $tile = createTile(letter, value, tileId);
        $rack.append($tile);
    }
    
    if (!$rack.data('uiDroppable')) {
        $rack.droppable({
            accept: '.tile',
            tolerance: 'fit', 
            drop: function(event, ui) {
                ui.draggable.css({ top: '', left: '', position: 'relative' }).appendTo(this);
                updateScore();
            }
        });
    }
}

// Takes current score of the word on the board after any tile is moves, 
// applying special tile bonuses as needed
function updateScore() {
    let currentWordScore = 0;
    let wordMultiplier = 1;

    let startIndex = boardState.findIndex(tile => tile !== null);
    let endIndex = boardState.findLastIndex(tile => tile !== null);
    
    if (startIndex === -1) { 
        $('#word-score-value').text('0'); 
        return; 
    }
    
    for (let i = startIndex; i <= endIndex; i++) {
        const tile = boardState[i];

        if (tile === null) { 
            currentWordScore = 0; 
            wordMultiplier = 1; 
            break; 
        }

        let letterScore = tile.value; 
        let squareBonus = 1;

        const bonus = SPECIAL_TILES.find(b => b.index === i); 
        if (bonus) {
            if (bonus.type === 'DL') { 
                squareBonus = squareBonus * 2;
            } 
            else if (bonus.type === 'DW') { 
                wordMultiplier = wordMultiplier * 2; 
            }
        }

        currentWordScore = currentWordScore + (letterScore * squareBonus);
    }
    
    currentWordScore = currentWordScore * wordMultiplier;
    $('#word-score-value').text(currentWordScore);
}

// Resets the entirity of game state, including tile inventory, scores, board
// and rack
function restart() {
    totalScore = 0;
    $('#total-score-value').text('0');
    resetTileInventory(); 
    $('#tile-rack').empty(); 
    clearBoard(); 
    dealNewTiles(7);  
}

// Clears all tiles from board and resets the array of the board state
function clearBoard() {
    $('#scrabble-board .tile').remove();
    $('#scrabble-board .board-square span').show(); 
    boardState = new Array(BOARD_SIZE).fill(null);
    $('#word-score-value').text('0');
}

