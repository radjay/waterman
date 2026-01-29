import SunCalc from 'suncalc';

/**
 * Calculate sun times (sunrise, golden hour, sunset, dusk) for a given location and date.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Date} [date] - Date to calculate for (defaults to today)
 * @returns {{ sunrise: Date, goldenHour: Date, sunset: Date, dusk: Date }}
 */
export function getSunTimes(lat, lng, date = new Date()) {
    const times = SunCalc.getTimes(date, lat, lng);
    
    return {
        sunrise: times.sunrise,
        goldenHour: times.goldenHour,
        sunset: times.sunset,
        dusk: times.dusk,
    };
}
