import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DSAProblemService {
    constructor() {
        this.problems = this.loadProblems();
        this.categories = this.categorizeProblems();
    }

    loadProblems() {
        try {
            const problemsPath = path.join(__dirname, '../data/filtered_output.json');
            const problemsData = fs.readFileSync(problemsPath, 'utf8');
            return JSON.parse(problemsData);
        } catch (error) {
            console.error('Error loading DSA problems:', error);
            return [];
        }
    }

    categorizeProblems() {
        const categories = {};
        
        this.problems.forEach(problem => {
            if (problem.topics && Array.isArray(problem.topics)) {
                problem.topics.forEach(topic => {
                    if (!categories[topic]) {
                        categories[topic] = [];
                    }
                    categories[topic].push(problem);
                });
            }
        });

        return categories;
    }

    getCategories() {
        return Object.keys(this.categories);
    }

    getProblemsByCategory(category) {
        return this.categories[category] || [];
    }

    selectRandomProblems(count = 4) {
        const categories = this.getCategories();
        const selectedProblems = [];
        
        // Generate random numbers for each category
        const categoryCounts = {};
        categories.forEach(category => {
            categoryCounts[category] = Math.floor(Math.random() * 3) + 1; // 1-3 problems per category
        });

        // Select problems from each category based on random count
        const allSelectedProblems = [];
        categories.forEach(category => {
            const problemsInCategory = this.getProblemsByCategory(category);
            const countToSelect = Math.min(categoryCounts[category], problemsInCategory.length);
            
            // Shuffle and select random problems from this category
            const shuffled = this.shuffleArray([...problemsInCategory]);
            const selected = shuffled.slice(0, countToSelect);
            allSelectedProblems.push(...selected);
        });

        // Shuffle all selected problems and pick final count
        const finalShuffled = this.shuffleArray(allSelectedProblems);
        return finalShuffled.slice(0, count);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getProblemById(id) {
        return this.problems.find(problem => problem.id === id);
    }

    getProblemBySlug(slug) {
        return this.problems.find(problem => problem.slug === slug);
    }

    
    getProblemsByDifficulty(difficulty) {
        return this.problems.filter(problem => problem.difficulty === difficulty);
    }

    
    getProblemsByTopics(topics) {
        if (!Array.isArray(topics)) {
            topics = [topics];
        }
        
        return this.problems.filter(problem => 
            problem.topics && problem.topics.some(topic => topics.includes(topic))
        );
    }

    // Get a balanced set of problems (different difficulties and topics)
    getBalancedProblemSet(count = 4) {
        const difficulties = ['Easy', 'Medium', 'Hard'];
        const selectedProblems = [];
        
        // Try to get at least one problem from each difficulty
        difficulties.forEach(difficulty => {
            const problemsOfDifficulty = this.getProblemsByDifficulty(difficulty);
            if (problemsOfDifficulty.length > 0) {
                const randomProblem = problemsOfDifficulty[Math.floor(Math.random() * problemsOfDifficulty.length)];
                if (!selectedProblems.find(p => p.id === randomProblem.id)) {
                    selectedProblems.push(randomProblem);
                }
            }
        });

        // Fill remaining slots with random problems
        while (selectedProblems.length < count) {
            const randomProblem = this.problems[Math.floor(Math.random() * this.problems.length)];
            if (!selectedProblems.find(p => p.id === randomProblem.id)) {
                selectedProblems.push(randomProblem);
            }
        }

        return selectedProblems.slice(0, count);
    }
}

export default new DSAProblemService(); 