const str = '@(user_id)[User Display Name]';
const regex = /@\(([^)]+)\)/g;
const match = str.match(regex);

if (match) {
    const id = match[1];       // "user_id"
    const display = match[2];  // "User Display Name"
    console.log({ id, display });
}