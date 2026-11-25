import { describe, expect, it } from "vitest";
import { CATEGORY_RULES, detectCategory } from "../src/lib/categorize";
import { CATEGORIES } from "../src/lib/types";

const cases: [string, string][] = [
  ["Petrol", "Fuel"], ["Petrol for car", "Fuel"], ["Diesel filling", "Fuel"], ["Fuel for vehicle", "Fuel"],
  ["Auto from station", "Travel"], ["Rickshaw fare", "Travel"], ["Cab booking", "Travel"], ["Taxi to airport", "Travel"],
  ["Traveller booking", "Travel"], ["Bus ticket", "Travel"], ["Train ticket to Delhi", "Travel"], ["Metro ticket", "Travel"],
  ["Breakfast at Dhaba", "Food"], ["Lunch with friends", "Food"], ["Dinner at Restaurant", "Food"], ["Food at Cafe", "Food"],
  ["Dinner with friends", "Food"], ["Stay at hotel", "Stay"], ["Hotel room booking", "Stay"], ["Room accommodation", "Stay"],
  ["Auto from railway station", "Travel"],
  ["Temple Donation", "Donation"], ["Donation to NGO", "Donation"], ["Charity contribution", "Donation"], ["Donated for social cause", "Donation"],
  ["Mandir Seva", "Donation"], ["Fundraising contribution", "Donation"], ["Chanda for event", "Donation"],
  ["Religious donation", "Donation"], ["Charitable trust", "Donation"], ["Mandir donation", "Donation"], ["Contribution", "Donation"],
];
describe("detectCategory", () => {
  it.each(cases)("%s -> %s", (title, cat) => expect(detectCategory(title)).toBe(cat));
  it("ignores case and extra spaces", () => {
    expect(detectCategory("   PETROL   for   CAR  ")).toBe("Fuel");
    expect(detectCategory("bReAkFaSt")).toBe("Food");
  });
  it("matches whole words only", () => {
    expect(detectCategory("Automatic car wash")).toBeNull();
    expect(detectCategory("Busy day")).toBeNull();
  });
  it("Fuel always beats other matches", () => {
    expect(detectCategory("Petrol pump cafe")).toBe("Fuel");
    expect(detectCategory("Diesel for bus")).toBe("Fuel");
  });
  it("resolves ties deterministically (earliest keyword wins)", () => {
    expect(detectCategory("Dinner at hotel")).toBe("Food");
    expect(detectCategory("Cab to restaurant")).toBe("Travel");
  });
  it("returns null when nothing matches", () => {
    expect(detectCategory("Movie tickets")).toBeNull();
    expect(detectCategory("")).toBeNull();
  });
  it("only suggests categories that exist in the app", () => {
    CATEGORY_RULES.forEach((r) => expect(CATEGORIES).toContain(r.category));
  });
  it("does not treat a generic contribution as a donation when the context says otherwise", () => {
    expect(detectCategory("Contribution for dinner")).toBe("Food");
    expect(detectCategory("Hotel room contribution")).toBe("Stay");
    expect(detectCategory("Petrol contribution")).toBe("Fuel");
    expect(detectCategory("Cab contribution")).toBe("Travel");
  });
  it("Donation is a real app category", () => expect(CATEGORIES).toContain("Donation"));
});
