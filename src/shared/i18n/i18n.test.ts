import { en } from "./en";
import { pluralEn, pluralRu } from "./plural";
import { ru } from "./ru";

describe("plural", () => {
  it("selects russian forms", () => {
    expect(pluralRu(1, "участник", "участника", "участников")).toBe("участник");
    expect(pluralRu(2, "участник", "участника", "участников")).toBe("участника");
    expect(pluralRu(5, "участник", "участника", "участников")).toBe("участников");
    expect(pluralRu(21, "участник", "участника", "участников")).toBe("участник");
  });

  it("selects english forms", () => {
    expect(pluralEn(1, "member", "members")).toBe("member");
    expect(pluralEn(2, "member", "members")).toBe("members");
  });
});

describe("dictionaries", () => {
  function keysOf(obj: Record<string, unknown>, prefix = ""): string[] {
    return Object.entries(obj).flatMap(([key, value]) =>
      typeof value === "object" && value !== null
        ? keysOf(value as Record<string, unknown>, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    );
  }

  it("ru and en have identical key sets", () => {
    expect(keysOf(en)).toEqual(keysOf(ru));
  });

  it("parametrized entries produce strings", () => {
    expect(ru.rooms.members(2)).toBe("2 участника");
    expect(en.rooms.members(2)).toBe("2 members");
    expect(ru.createRoom.summary(5, 7, 2)).toContain("5 тренировок");
    expect(en.room.votesFor(1, 2)).toBe("1 of 2 approvals");
  });
});
