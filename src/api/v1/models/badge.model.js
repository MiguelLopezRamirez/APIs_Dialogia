// models/badge.model.js
class Badge {
    constructor(badgeId, badgeName, description, xp) {
        this.badgeId     = badgeId;     // ej. 'create10'
        this.badgeName   = badgeName;   // ej. 'El Arquitecto'
        this.description = description; // ej. 'Has dado forma a 10 debates.'
        this.xp          = xp;          // ej. 150
      }
}

export { Badge };
