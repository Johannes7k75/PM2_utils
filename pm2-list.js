const Table = require("cli-table");
const colors = require("colors/safe");
const pm2 = require("pm2");

colors.setTheme({
  header: ["brightCyan", "bold"],
  online: ["brightGreen", "bold"],
  offline: ["brightRed", "bold"],
});

/**
 * Get the pm2 list in json format
 * @returns {Promise<pm2.ProcessDescription[]>}
 */
const getJsonList = async () => new Promise((res, rej) => pm2.list((err, list) => (err ? rej(err) : res(list))));

/**
 * Convert the pm2 list in json format into a cli-table
 * @returns {Table}
 */
async function jsonMapToTable() {
  const data = await getJsonList();
  const usePerformance = process.argv.includes("--perf");
  const heads = ["id", "name", "pid", "uptime", "↺", "status"];

  if (usePerformance) {
    heads.push("cpu", "mem");
  }

  const table = new Table({
    head: heads.map((head) => colors.header(head)),
    style: {
      compact: true,
    },
  });

  for (const process of data) {
    const isOnline = process.pm2_env.status === "online";
    const color = isOnline ? colors.online : colors.offline;

    const tableRow = [colors.header(process.pm_id), process.name, process.pid?? "N/A", isOnline ? formatDuration(new Date(Date.now() - process.pm2_env.pm_uptime)) : 0, process.pm2_env.restart_time, color(process.pm2_env.status)];

    if (usePerformance) {
      tableRow.push(`${process.monit.cpu.toFixed()}%`, process.monit.memory <= 0 ? "0b" : `${bytesToMB(process.monit.memory)}mb`);
    }

    table.push(tableRow);
  }

  console.log(table.toString());
  process.exit(0);
}

/**
 * Color the process status
 * @param {string} status
 * @returns {string}
 */
function formatStatus(status) {
  return status === "online" ? colors.online(status) : colors.offline(status);
}

/**
 * Convert bytes into MegaBytes
 * @param {number} bytes
 * @returns {number}
 */
function bytesToMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1); // Convert to MB and round to 2 decimal places
}

/**
 * Forma a Date into Days, hours, minutes and seconds
 * @param {Date} date
 * @returns {string}
 */
function formatDuration(date) {
  const milliseconds = date.getTime();
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}D`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

jsonMapToTable();
