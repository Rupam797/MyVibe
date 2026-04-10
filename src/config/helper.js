
export function timeAgo(dateString) {
  if (!dateString) return "";
  
  // The backend is forced into UTC timezone but omits the 'Z' metadata when serializing LocalDateTime.
  // We explicitly append 'Z' to inform JavaScript this string represents UTC time, not local.
  if (!dateString.endsWith('Z')) {
    dateString += 'Z';
  }
  
  const date = new Date(dateString);
  const now = new Date();
  
  const secondsAgo = Math.floor((now - date) / 1000);
  
  if (secondsAgo < 10) {
    return "just now";
  } else if (secondsAgo < 60) {
    const tens = Math.floor(secondsAgo / 10) * 10;
    return `${tens} sec ago`;
  }
  
  // Clone 'now' to check for yesterday without mutating 'now'
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeString = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return timeString; // e.g., "10:45 AM"
  } else if (isYesterday) {
    return `Yesterday, ${timeString}`; // e.g., "Yesterday, 10:45 AM"
  } else {
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${dateStr}, ${timeString}`; // e.g., "Oct 24, 10:45 AM"
  }
}
