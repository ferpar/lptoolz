import { getEstimatesStoploss } from "../domain/impermanentLoss";
import readline from "readline";

function prompt(question: string) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise<string>((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function main() {
// greet the user
console.log("Welcome to the impermanent loss calculator");

// prompt user for top price
const topPrice = await prompt("Please enter the top price \n") || "0";
// prompt user for the exit price
const stopLossPrice = await prompt("Please enter the exit price \n") || "0";
// prompt the user for the fraction to Stop Loss
const fraction = await prompt("Please enter the fraction to Stop Loss \n") || "0";

// calculate the impermanent loss
const estimates = getEstimatesStoploss(
    parseFloat(topPrice),
    parseFloat(stopLossPrice),
    parseFloat(fraction)
);

console.table(estimates)
}

main()