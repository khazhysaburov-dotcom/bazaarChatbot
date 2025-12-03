export const enum CarType {
    SUV = 'SUV',
    SEDAN = 'Sedan',
    SPORTS = 'Sports',
    TRUCK = 'Truck',
    ELECTRIC = 'Electric'
}

export interface Car {
    id: string;
    make: string;
    model: string;
    year: number;
    price: number;
    type: CarType;
    color: string;
    mileage: number;
    description: string;
    features: string[];
    imageUrl: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

export interface ChatState {
    isOpen: boolean;
    messages: ChatMessage[];
    isTyping: boolean;
}