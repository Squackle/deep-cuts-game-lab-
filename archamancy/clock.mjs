// The browser loop's game clock: runs fixed simulation ticks for the real time that has passed.
// The clock runs during a wave, and between waves while Onslaught counts down to the next one.
export const clockRunning=game=>game.state.phase==="active"||game.onslaughtLeft()!==null;
// Steps the game for `accumulator` ms of game time. Returns the time left over (zero once the clock stops).
export function advance(game,accumulator){
 while(accumulator>=game.tickMs&&clockRunning(game)){game.step();accumulator-=game.tickMs;}
 return clockRunning(game)?accumulator:0;
}
