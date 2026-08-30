import {getTeams, saveTeams} from "./index.js";

export const TEAM_RELATION = Object.freeze({
    FRIENDLY: "friendly",
    NEUTRAL: "neutral",
    HOSTILE: "hostile"
});
export function getTeamRelation(teamA, teamB) {
    if (!teamA || !teamB) {
        return TEAM_RELATION.NEUTRAL;
    }

    if (teamA === teamB) {
        return TEAM_RELATION.FRIENDLY;
    }

    const teams = getTeams();

    const teamData = teams[teamA];

    if (!teamData?.relations) {
        return TEAM_RELATION.NEUTRAL;
    }

    return (
        teamData.relations[teamB] ??
        TEAM_RELATION.NEUTRAL
    );
}
export function setTeamRelation(teamA, teamB, relation) {
    if (!teamA || !teamB || teamA === teamB) {
        return false;
    }

    if (!Object.values(TEAM_RELATION).includes(relation)) {
        return false;
    }

    const teams = getTeams();

    if (!teams[teamA] || !teams[teamB]) {
        return false;
    }

    teams[teamA].relations ??= {};
    teams[teamB].relations ??= {};

    teams[teamA].relations[teamB] = relation;
    teams[teamB].relations[teamA] = relation;

    return saveTeams(teams);
}