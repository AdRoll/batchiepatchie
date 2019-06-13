const CHART_COLORS = [
    '#FF0000',
    '#7F0000',
    '#FFA280',
    '#806C60',
    '#FF8800',
    '#FFE1BF',
    '#996600',
    '#FFCC00',
    '#66644D',
    '#4C4700',
    '#EEFF00',
    '#FBFFBF',
    '#66FF00',
    '#7DB359',
    '#8FBFA3',
    '#005930',
    '#00FFAA',
    '#00EEFF',
    '#003C40',
    '#00AAFF',
    '#738C99',
    '#004480',
    '#0066FF',
    '#0000FF',
    '#0000BF',
    '#1A1966',
    '#C8BFFF',
    '#9559B3',
    '#CC00FF',
    '#590047',
    '#FF00AA',
    '#FFBFEA',
    '#A65369',
    '#FF4059',
    '#400009',
];

// Persist colors for consistency
const savedColors = {};
let index = 0;

export default function getChartColor(value) {
    if (savedColors[value]) {
        return savedColors[value];
    }
    const color = CHART_COLORS[index % CHART_COLORS.length];
    savedColors[value] = color;
    index++;
    return color;
}
