## About Macromap

Maromap allows you to interactively create your starcraft 2 build order in the web browser. This is more of a proof of concept than a useful tool.
It works only for the Terran race, and it still incomplete. There are no spells, no rich minerals, and a lot of bugs :) The resource calculations are also a wild guess, since I don't have a beta key to test how many minerals an SCV mines per minute. Also, the calculation algorithm is far from perfect - it presumes that all mineral fields are equally distanced from the Command Center. The saturation limit calculation is discrete and workers stop adding extra minerals after there is one worker per field. This stuff will get ironed out when I get a hold on the game and do some tests.

**Note:** I stopped working on this project a while ago, but it might be still useful to you.

### How to use

- Open *index.html* in a browser that's not IE.
- Select units by clicking on their names on the left side.
- Multiple units can be selected by holding ctrl (command on Macs) but only if they are of the same type.
- The horizontal strip with numbers on it indicates the current time. Click on it to set the time. A thin black line will appear.
- You can also click and drag on it to change the time gradually. The status panel on the right side will update.
- Click on "Do Stuff" after you have selected a unit and selected the desired time of the action. A popup will apear with available commands for that unit.
- A shortcut for this is to doubleclick on a unit's horizontal timeline. The time will be automatically set and the popup will apear
- You can Undo your last action by clicking on "Undo", but you can't redo the undone action.
- Save your build order by copying the serialized Javascript code.
- Load it by pasting the copied code.
- Have fun, report bugs.