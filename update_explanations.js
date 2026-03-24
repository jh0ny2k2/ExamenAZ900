const fs = require('fs');
const path = require('path');

const sourcePath = path.join('c:', 'Users', 'JhonathanChaves', 'Desktop', 'Jhonathan Chaves', 'AZ-900', 'Proximas Cert', 'Associate Cloud Engineer', 'preguntas');
const targetPath = path.join('c:', 'Users', 'JhonathanChaves', 'Desktop', 'Jhonathan Chaves', 'AZ-900', 'Preguntas', 'preguntasGCPACE.json');

try {
    const rawData = fs.readFileSync(sourcePath, 'utf8');
    const targetData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

    // Split source by "Question X"
    const questions = rawData.split(/Question \d+/i);
    console.log(`Found ${questions.length} question blocks in source.`);

    // Update target JSON
    let updatedCount = 0;
    targetData.forEach((item, idx) => {
        // Clean up the target question text for better matching
        const cleanTargetQ = item.question.replace(/\s+/g, ' ').trim().substring(0, 50).toLowerCase();
        
        const sourceMatch = questions.find(q => {
            const cleanSourceQ = q.replace(/\s+/g, ' ').trim().toLowerCase();
            return cleanSourceQ.includes(cleanTargetQ);
        });
        
        if (sourceMatch) {
            // Find "Selected Answer" or "is correct"
            const match = sourceMatch.match(/(?:Selected Answer:|is correct|Option \w is correct|Correct Answer:)[\s\S]+/i);
            if (match) {
                let explanation = match[0].trim();
                explanation = explanation.replace(/\[-\]/g, '').replace(/\n+/g, '\n').trim();
                item.explanation = explanation;
                updatedCount++;
            }
        }
    });

    fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2));
    console.log(`Successfully updated ${updatedCount} explanations in preguntasGCPACE.json`);

} catch (error) {
    console.error('Error processing questions:', error);
}
