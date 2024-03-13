export interface IGameServer{
    start: () => void;
    restart: () => void;
    stop: () => void;
    getConfig: () => void;
}