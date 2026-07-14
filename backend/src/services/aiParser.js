import Employee from "../models/Employee.js";
import Seat from "../models/Seat.js";
import Project from "../models/Project.js";

/**
 * Rule-based natural-language query parser (no external LLM).
 * Detects intent via keywords/regex, extracts entities (email, name, floor,
 * project), runs the matching DB query, returns a human answer + structured data.
 */
export async function answerQuery(rawQuery) {
  const query = (rawQuery || "").trim();
  const lower = query.toLowerCase();
  if (!query) return { answer: "Please ask a question.", intent: "empty" };

  const email = extractEmail(query);
  const floor = extractFloor(lower);

  // Intent: available seats (optionally on a floor)
  if (/(available|free|empty|vacant)\s+seats?/.test(lower) || /show.*seats?/.test(lower)) {
    const q = { status: "available" };
    if (floor != null) q.floor = floor;
    const count = await Seat.countDocuments(q);
    const sample = await Seat.find(q).limit(5);
    const where = floor != null ? ` on Floor ${floor}` : "";
    return {
      intent: "available_seats",
      answer:
        `There are ${count} available seats${where}.` +
        (sample.length
          ? ` e.g. ${sample.map(seatLabel).join(", ")}.`
          : ""),
      data: { count, sample },
    };
  }

  // Intent: seat utilization for a project ("how many seats occupied for Project X")
  const projByName = await matchProject(lower);
  if (projByName && /(occupied|utiliz|how many|count|seats?)/.test(lower)) {
    const occupied = await Seat.countDocuments({
      allocated_project: projByName._id,
      status: "occupied",
    });
    const headcount = await Employee.countDocuments({ project: projByName._id });
    return {
      intent: "project_utilization",
      answer: `Project ${projByName.name} has ${occupied} occupied seats and ${headcount} employees assigned.`,
      data: { project: projByName.name, occupied, headcount },
    };
  }

  // Intent: locate an employee (by email or name) -> "where is my seat / where is X seated"
  if (/(where|seat|sitting|located|desk)/.test(lower) || email) {
    const employee = await findEmployee({ email, query });
    if (!employee)
      return {
        intent: "locate_employee",
        answer:
          "Couldn't find that employee. Try including a full name or the email.",
      };

    const seat = await Seat.findOne({
      allocated_employee: employee._id,
      status: "occupied",
    });
    const projName = employee.project?.name || "unassigned";

    if (!seat)
      return {
        intent: "locate_employee",
        answer: `${employee.name} has no seat allocated yet. Project: ${projName}.`,
        data: { employee: employee.name, project: projName, seat: null },
      };

    return {
      intent: "locate_employee",
      answer: `${firstWord(query, employee)} allocated Floor ${seat.floor}, Zone ${seat.zone}, Bay ${seat.bay}, Seat ${seat.seat_number}. Project: ${projName}.`,
      data: {
        employee: employee.name,
        project: projName,
        seat: seatLabel(seat),
        floor: seat.floor,
        zone: seat.zone,
        bay: seat.bay,
        seat_number: seat.seat_number,
      },
    };
  }

  // Intent: which project is employee assigned to
  if (/project/.test(lower)) {
    const employee = await findEmployee({ email, query });
    if (employee) {
      const projName = employee.project?.name || "unassigned";
      return {
        intent: "employee_project",
        answer: `${employee.name} is assigned to project ${projName}.`,
        data: { employee: employee.name, project: projName },
      };
    }
  }

  return {
    intent: "unknown",
    answer:
      "I can answer: where an employee sits, their project, available seats on a floor, or project seat utilization. Try: \"Where is my seat? My email is amit@ethara.ai\".",
  };
}

// --- entity extraction & lookups ---
function extractEmail(text) {
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0].toLowerCase() : null;
}
function extractFloor(lower) {
  const m = lower.match(/floor\s*(\d+)/);
  return m ? Number(m[1]) : null;
}
function seatLabel(s) {
  return `${s.seat_number} (F${s.floor}/${s.zone}/${s.bay})`;
}
function firstWord(query, employee) {
  // "Where is my seat" -> "You are"; else "<Name> is"
  return /\bmy\b|\bi am\b|\bi'm\b/.test(query.toLowerCase())
    ? "You are"
    : `${employee.name} is`;
}

async function matchProject(lower) {
  const projects = await Project.find().select("name");
  return projects.find((p) => lower.includes(p.name.toLowerCase())) || null;
}

async function findEmployee({ email, query }) {
  if (email) {
    const byEmail = await Employee.findOne({ email }).populate("project", "name");
    if (byEmail) return byEmail;
  }
  // Try an explicit capitalized / "employee X" name first
  const nameGuess = extractName(query);
  if (nameGuess) {
    const byName = await Employee.findOne({
      name: { $regex: nameGuess, $options: "i" },
    }).populate("project", "name");
    if (byName) return byName;
  }
  // Fallback: try each remaining word token (handles lowercase "amit").
  // Each candidate is validated against the DB, so junk tokens simply miss.
  for (const token of nameTokens(query)) {
    const hit = await Employee.findOne({
      name: { $regex: `\\b${token}`, $options: "i" },
    }).populate("project", "name");
    if (hit) return hit;
  }
  return null;
}

// Word tokens worth trying as a first name (>=3 letters, not a stopword)
const STOP_WORDS = new Set([
  "where","which","show","who","how","many","seat","seats","seated","sitting",
  "desk","project","floor","zone","the","and","for","are","him","her","his",
  "she","assigned","allocated","available","occupied","tell","can","you","what",
  "whats","is","at","on","in","of","my","me","near","team","hes","she's","this",
]);
function nameTokens(query) {
  return (query.match(/[A-Za-z]{3,}/g) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => !STOP_WORDS.has(w));
}

function extractName(query) {
  // Look for "employee X", "is X seated", or capitalized words
  const m =
    query.match(/employee\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i) ||
    query.match(/is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:seated|sitting|located)/);
  if (m) return m[1].trim();
  const caps = query.match(/\b[A-Z][a-z]{2,}\b/g);
  // Ignore common leading words
  const stop = new Set(["Where", "Which", "Show", "Who", "How", "Floor", "Zone", "Project"]);
  const cand = (caps || []).filter((w) => !stop.has(w));
  return cand.length ? cand.join(" ") : null;
}
