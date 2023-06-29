# About

A block movement style game, for the Grey Hack game.


## Installing

Copy the text of [`fallingblocks.src`](fallingblocks.src) into the Grey Hack game, in a new text file, say `Downloads/fallingblocks.src`

Then, build it.  For example:

```bash
$ build Downloads/fallingblocks.src /home/guest
```


## Playing

Start two terminal windows.  The first one shows the game state, the other one controls it.

Each terminal will run the `fallingblocks`

**Terminal 1:**

Start the display:

```bash
$ /home/guest/fallingblocks /home/guest/c.txt -d
```

**Terminal 2:**

Start the controller:

```bash
$ /home/guest/fallingblocks /home/guest/c.txt
```

You'll need the controller terminal to have the focus in order to play.  To play:

* Left arrow - move the block left.
* Right arrow - move the block right.
* Down arrow - advance the block down.
* up arrow - rotate the block.
* z - rotate the block one way.
* x - rotate the block the other way.


# Bugs

* The shapes aren't right.  Some rotations don't have them appear right.
* There's a super annoying flicker.  The refresh rate needs to be set just right.
