/**
 * Menú de preguntas por categorías (nl / es / en).
 */
const QuestionMenu = {
  nl: [
    {
      title: 'Uiterlijk',
      icon: '✨',
      items: [
        { text: 'Hoe zie ik eruit?', icon: '✨', intent: 'look' },
        { text: 'Hoe zie ik er vandaag uit?', icon: '👀', intent: 'look' },
        { text: 'Geef me een compliment', icon: '💕', intent: 'compliment' },
        { text: 'Bekijk mijn hele stijl', icon: '📸', intent: 'analyze', action: 'analyze' },
      ],
    },
    {
      title: 'Haar',
      icon: '💇',
      items: [
        { text: 'Wat vind je van mijn haar?', icon: '💇', intent: 'hair' },
        { text: 'Staat mijn haar goed?', icon: '💫', intent: 'hair' },
        { text: 'Hoe zit mijn kapsel?', icon: '✂️', intent: 'hair' },
        { text: 'Past mijn haar bij mijn look?', icon: '🪞', intent: 'hair' },
      ],
    },
    {
      title: 'Make-up',
      icon: '💄',
      items: [
        { text: 'Wat vind je van mijn make-up?', icon: '💄', intent: 'makeup' },
        { text: 'Zit mijn make-up goed?', icon: '💋', intent: 'makeup' },
        { text: 'Is mijn make-up te veel?', icon: '🎨', intent: 'makeup' },
        { text: 'Straalt mijn gezicht fris?', icon: '🌸', intent: 'makeup' },
      ],
    },
    {
      title: 'Kleding',
      icon: '👗',
      items: [
        { text: 'Vind je mijn kleding leuk?', icon: '👗', intent: 'outfit' },
        { text: 'Wat vind je van wat ik draag?', icon: '👚', intent: 'outfit' },
        { text: 'Welke kleuren draag ik?', icon: '🎨', intent: 'colors' },
        { text: 'Wat raad je me aan?', icon: '💡', intent: 'advice' },
      ],
    },
    {
      title: 'Meer',
      icon: '💬',
      items: [
        { text: 'Sta ik goed voor een date?', icon: '💫', intent: 'date' },
        { text: 'Hoe heet ik?', icon: '🙋', intent: 'name' },
        { text: 'Hallo Mirror', icon: '👋', intent: 'greeting' },
        { text: 'Bedankt', icon: '🙂', intent: 'thanks' },
      ],
    },
  ],
  es: [
    {
      title: 'Aspecto',
      icon: '✨',
      items: [
        { text: '¿Cómo luzco?', icon: '✨', intent: 'look' },
        { text: '¿Cómo me veo hoy?', icon: '👀', intent: 'look' },
        { text: 'Dame un cumplido', icon: '💕', intent: 'compliment' },
        { text: 'Analiza mi look completo', icon: '📸', intent: 'analyze', action: 'analyze' },
      ],
    },
    {
      title: 'Cabello',
      icon: '💇',
      items: [
        { text: '¿Qué te parece mi cabello?', icon: '💇', intent: 'hair' },
        { text: '¿Me queda bien el pelo?', icon: '💫', intent: 'hair' },
        { text: '¿Cómo está mi peinado?', icon: '✂️', intent: 'hair' },
        { text: '¿Combina mi cabello con mi look?', icon: '🪞', intent: 'hair' },
      ],
    },
    {
      title: 'Maquillaje',
      icon: '💄',
      items: [
        { text: '¿Qué opinas de mi maquillaje?', icon: '💄', intent: 'makeup' },
        { text: '¿Está bien mi maquillaje?', icon: '💋', intent: 'makeup' },
        { text: '¿Llevo demasiado maquillaje?', icon: '🎨', intent: 'makeup' },
        { text: '¿Se ve fresco mi rostro?', icon: '🌸', intent: 'makeup' },
      ],
    },
    {
      title: 'Ropa',
      icon: '👗',
      items: [
        { text: '¿Te gusta mi outfit?', icon: '👗', intent: 'outfit' },
        { text: '¿Qué opinas de mi ropa?', icon: '👚', intent: 'outfit' },
        { text: '¿Qué colores llevo?', icon: '🎨', intent: 'colors' },
        { text: '¿Qué me recomiendas?', icon: '💡', intent: 'advice' },
      ],
    },
    {
      title: 'Más',
      icon: '💬',
      items: [
        { text: '¿Voy bien para una cita?', icon: '💫', intent: 'date' },
        { text: '¿Cómo me llamo?', icon: '🙋', intent: 'name' },
        { text: 'Hola Mirror', icon: '👋', intent: 'greeting' },
        { text: 'Gracias', icon: '🙂', intent: 'thanks' },
      ],
    },
  ],
  en: [
    {
      title: 'Appearance',
      icon: '✨',
      items: [
        { text: 'How do I look?', icon: '✨', intent: 'look' },
        { text: 'How do I look today?', icon: '👀', intent: 'look' },
        { text: 'Give me a compliment', icon: '💕', intent: 'compliment' },
        { text: 'Analyze my full look', icon: '📸', intent: 'analyze', action: 'analyze' },
      ],
    },
    {
      title: 'Hair',
      icon: '💇',
      items: [
        { text: 'What do you think of my hair?', icon: '💇', intent: 'hair' },
        { text: 'Does my hair look good?', icon: '💫', intent: 'hair' },
        { text: 'How is my hairstyle?', icon: '✂️', intent: 'hair' },
        { text: 'Does my hair match my look?', icon: '🪞', intent: 'hair' },
      ],
    },
    {
      title: 'Makeup',
      icon: '💄',
      items: [
        { text: 'What do you think of my makeup?', icon: '💄', intent: 'makeup' },
        { text: 'Is my makeup on point?', icon: '💋', intent: 'makeup' },
        { text: 'Is my makeup too much?', icon: '🎨', intent: 'makeup' },
        { text: 'Does my face look fresh?', icon: '🌸', intent: 'makeup' },
      ],
    },
    {
      title: 'Outfit',
      icon: '👗',
      items: [
        { text: 'Do you like my outfit?', icon: '👗', intent: 'outfit' },
        { text: 'What do you think of my clothes?', icon: '👚', intent: 'outfit' },
        { text: 'What colors am I wearing?', icon: '🎨', intent: 'colors' },
        { text: 'What do you recommend?', icon: '💡', intent: 'advice' },
      ],
    },
    {
      title: 'More',
      icon: '💬',
      items: [
        { text: 'Do I look good for a date?', icon: '💫', intent: 'date' },
        { text: "What's my name?", icon: '🙋', intent: 'name' },
        { text: 'Hi Mirror', icon: '👋', intent: 'greeting' },
        { text: 'Thank you', icon: '🙂', intent: 'thanks' },
      ],
    },
  ],
};
