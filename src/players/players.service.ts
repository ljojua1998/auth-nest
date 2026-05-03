import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player, PlayerPosition } from './entities/player.entity';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { FilterPlayersDto } from './dto/filter-players.dto';
import { MatchStat } from '../matches/entities/match-stat.entity';
import { Team } from '../teams/entities/team.entity';
import { Tier } from '../tiers/entities/tier.entity';

// ─── Tier assignment by apiFootballId ───────────────────────────────────────
const SUPERSTAR_IDS = new Set([
  133609, 44, 386828, 1323,           // Spain: Pedri, Rodri, Yamal, Olmo
  762, 10009, 1496,                   // Brazil: Vinicius, Rodrygo, Raphinha
  129718, 1460, 631, 184,             // England: Bellingham, Saka, Foden, Kane
  154, 217, 6009, 2472, 6716,         // Argentina: Messi, Lautaro, Alvarez, DePaul, MacAllister
  203224, 502, 978,                   // Germany: Wirtz, Kimmich, Havertz
]);

const STRONG_IDS = new Set([
  19465, 47315, 328, 47311, 563, 396623, 622, 47301, // Spain starters
  617, 257, 372, 22224, 10135, 747, 1646, 2413, 127769, 425733, 377122, // Brazil starters
  2932, 626, 2937, 152982, 284322, 2935, 19354,       // England starters
  19599, 30776, 624, 529, 5996, 1578, 6503,           // Argentina starters
  2285, 972, 26243, 511, 644, 510, 25158,             // Germany starters
]);

const RESERVE_IDS = new Set([
  338751, 443162,   // Spain: fringe
  70366, 197383, 133910,  // Brazil: no number / fringe
  307123,           // England: O'Reilly
  620791,           // Argentina: Talavera (18yo, no number)
  494131,           // Germany: Karl (17yo)
]);

type RawPosition = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';

const POS_MAP: Record<RawPosition, PlayerPosition> = {
  Goalkeeper: PlayerPosition.GK,
  Defender: PlayerPosition.DEF,
  Midfielder: PlayerPosition.MID,
  Attacker: PlayerPosition.FWD,
};

interface RawPlayer {
  id: number;
  name: string;
  position: RawPosition;
  photo: string;
}

const TOP5_DATA: { teamCode: string; players: RawPlayer[] }[] = [
  {
    teamCode: 'ESP',
    players: [
      { id: 19465, name: 'David Raya', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/19465.png' },
      { id: 47269, name: 'Álex Remiro', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/47269.png' },
      { id: 47270, name: 'Unai Simón', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/47270.png' },
      { id: 396623, name: 'Pau Cubarsí', position: 'Defender', photo: 'https://media.api-sports.io/football/players/396623.png' },
      { id: 47380, name: 'Marc Cucurella', position: 'Defender', photo: 'https://media.api-sports.io/football/players/47380.png' },
      { id: 563, name: 'Álex Grimaldo', position: 'Defender', photo: 'https://media.api-sports.io/football/players/563.png' },
      { id: 361497, name: 'D. Huijsen', position: 'Defender', photo: 'https://media.api-sports.io/football/players/361497.png' },
      { id: 622, name: 'Aymeric Laporte', position: 'Defender', photo: 'https://media.api-sports.io/football/players/622.png' },
      { id: 47301, name: 'Robin Le Normand', position: 'Defender', photo: 'https://media.api-sports.io/football/players/47301.png' },
      { id: 753, name: 'Marcos Llorente', position: 'Defender', photo: 'https://media.api-sports.io/football/players/753.png' },
      { id: 333682, name: 'Cristhian Mosquera', position: 'Defender', photo: 'https://media.api-sports.io/football/players/333682.png' },
      { id: 47519, name: 'Pedro Porro', position: 'Defender', photo: 'https://media.api-sports.io/football/players/47519.png' },
      { id: 47278, name: 'Dani Vivian', position: 'Defender', photo: 'https://media.api-sports.io/football/players/47278.png' },
      { id: 336594, name: 'Pablo Barrios', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/336594.png' },
      { id: 340626, name: 'Fermín', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/340626.png' },
      { id: 1697, name: 'Pablo Fornals', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/1697.png' },
      { id: 47516, name: 'Aleix García', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/47516.png' },
      { id: 47311, name: 'Mikel Merino', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/47311.png' },
      { id: 1323, name: 'Dani Olmo', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/1323.png' },
      { id: 133609, name: 'Pedri', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/133609.png' },
      { id: 44, name: 'Rodri', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/44.png' },
      { id: 443162, name: 'Jesús Rodríguez', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/443162.png' },
      { id: 328, name: 'Fabián Ruiz', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/328.png' },
      { id: 930, name: 'Carlos Soler', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/930.png' },
      { id: 47315, name: 'Martín Zubimendi', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/47315.png' },
      { id: 182219, name: 'Álex Baena', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/182219.png' },
      { id: 47317, name: 'Barrenetxea', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/47317.png' },
      { id: 47348, name: 'Borja Iglesias', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/47348.png' },
      { id: 386828, name: 'Lamine Yamal', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/386828.png' },
      { id: 338751, name: 'Víctor Muñoz', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/338751.png' },
      { id: 47323, name: 'Mikel Oyarzabal', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/47323.png' },
      { id: 184226, name: 'Yeremy Pino', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/184226.png' },
      { id: 358628, name: 'Samu', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/358628.png' },
      { id: 931, name: 'Ferran Torres', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/931.png' },
      { id: 128582, name: 'Jorge de Frutos', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/128582.png' },
    ],
  },
  {
    teamCode: 'BRA',
    players: [
      { id: 10111, name: 'Bento', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/10111.png' },
      { id: 617, name: 'Ederson', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/617.png' },
      { id: 123759, name: 'Hugo Souza', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/123759.png' },
      { id: 70366, name: 'John', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/70366.png' },
      { id: 860, name: 'Alex Sandro', position: 'Defender', photo: 'https://media.api-sports.io/football/players/860.png' },
      { id: 307835, name: 'Beraldo', position: 'Defender', photo: 'https://media.api-sports.io/football/players/307835.png' },
      { id: 30497, name: 'Bremer', position: 'Defender', photo: 'https://media.api-sports.io/football/players/30497.png' },
      { id: 10316, name: 'Caio Henrique', position: 'Defender', photo: 'https://media.api-sports.io/football/players/10316.png' },
      { id: 618, name: 'Danilo', position: 'Defender', photo: 'https://media.api-sports.io/football/players/618.png' },
      { id: 372, name: 'Éder Militão', position: 'Defender', photo: 'https://media.api-sports.io/football/players/372.png' },
      { id: 10089, name: 'Fabricio Bruno', position: 'Defender', photo: 'https://media.api-sports.io/football/players/10089.png' },
      { id: 22224, name: 'Gabriel Magalhães', position: 'Defender', photo: 'https://media.api-sports.io/football/players/22224.png' },
      { id: 30424, name: 'Ibañez', position: 'Defender', photo: 'https://media.api-sports.io/football/players/30424.png' },
      { id: 309792, name: 'Kaiki', position: 'Defender', photo: 'https://media.api-sports.io/football/players/309792.png' },
      { id: 10124, name: 'Léo Pereira', position: 'Defender', photo: 'https://media.api-sports.io/football/players/10124.png' },
      { id: 197383, name: 'Luciano Juba', position: 'Defender', photo: 'https://media.api-sports.io/football/players/197383.png' },
      { id: 257, name: 'Marquinhos', position: 'Defender', photo: 'https://media.api-sports.io/football/players/257.png' },
      { id: 133910, name: 'Paulo Henrique', position: 'Defender', photo: 'https://media.api-sports.io/football/players/133910.png' },
      { id: 24866, name: 'Douglas Santos', position: 'Defender', photo: 'https://media.api-sports.io/football/players/24866.png' },
      { id: 8661, name: 'Vitinho', position: 'Defender', photo: 'https://media.api-sports.io/football/players/8661.png' },
      { id: 349001, name: 'Wesley', position: 'Defender', photo: 'https://media.api-sports.io/football/players/349001.png' },
      { id: 265784, name: 'André', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/265784.png' },
      { id: 305834, name: 'Andrey Santos', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/305834.png' },
      { id: 10135, name: 'Bruno Guimarães', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/10135.png' },
      { id: 10238, name: 'Carlos Augusto', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/10238.png' },
      { id: 747, name: 'Casemiro', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/747.png' },
      { id: 275170, name: 'Danilo', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/275170.png' },
      { id: 299, name: 'Fabinho', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/299.png' },
      { id: 80552, name: 'Gabriel Sara', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/80552.png' },
      { id: 195103, name: 'João Gomes', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/195103.png' },
      { id: 723, name: 'Joelinton', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/723.png' },
      { id: 1646, name: 'Lucas Paquetá', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/1646.png' },
      { id: 1165, name: 'Matheus Cunha', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/1165.png' },
      { id: 377122, name: 'Endrick', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/377122.png' },
      { id: 425733, name: 'Estêvão', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/425733.png' },
      { id: 9366, name: 'Igor Jesus', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/9366.png' },
      { id: 10329, name: 'João Pedro', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/10329.png' },
      { id: 265785, name: 'Luiz Henrique', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/265785.png' },
      { id: 127769, name: 'Gabriel Martinelli', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/127769.png' },
      { id: 1496, name: 'Raphinha', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/1496.png' },
      { id: 407806, name: 'Rayan', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/407806.png' },
      { id: 2413, name: 'Richarlison', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/2413.png' },
      { id: 10009, name: 'Rodrygo', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/10009.png' },
      { id: 196156, name: 'Thiago', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/196156.png' },
      { id: 762, name: 'Vinícius Júnior', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/762.png' },
      { id: 340279, name: 'Vitor Roque', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/340279.png' },
    ],
  },
  {
    teamCode: 'ENG',
    players: [
      { id: 19088, name: 'D. Henderson', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/19088.png' },
      { id: 2932, name: 'J. Pickford', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/2932.png' },
      { id: 20355, name: 'A. Ramsdale', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/20355.png' },
      { id: 18960, name: 'J. Steele', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/18960.png' },
      { id: 162489, name: 'J. Trafford', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/162489.png' },
      { id: 18961, name: 'D. Burn', position: 'Defender', photo: 'https://media.api-sports.io/football/players/18961.png' },
      { id: 19720, name: 'T. Chalobah', position: 'Defender', photo: 'https://media.api-sports.io/football/players/19720.png' },
      { id: 67971, name: 'M. Guéhi', position: 'Defender', photo: 'https://media.api-sports.io/football/players/67971.png' },
      { id: 284492, name: 'L. Hall', position: 'Defender', photo: 'https://media.api-sports.io/football/players/284492.png' },
      { id: 19545, name: 'R. James', position: 'Defender', photo: 'https://media.api-sports.io/football/players/19545.png' },
      { id: 19354, name: 'E. Konsa', position: 'Defender', photo: 'https://media.api-sports.io/football/players/19354.png' },
      { id: 313245, name: 'M. Lewis-Skelly', position: 'Defender', photo: 'https://media.api-sports.io/football/players/313245.png' },
      { id: 158694, name: 'T. Livramento', position: 'Defender', photo: 'https://media.api-sports.io/football/players/158694.png' },
      { id: 2935, name: 'H. Maguire', position: 'Defender', photo: 'https://media.api-sports.io/football/players/2935.png' },
      { id: 158698, name: 'J. Quansah', position: 'Defender', photo: 'https://media.api-sports.io/football/players/158698.png' },
      { id: 19235, name: 'D. Spence', position: 'Defender', photo: 'https://media.api-sports.io/football/players/19235.png' },
      { id: 626, name: 'J. Stones', position: 'Defender', photo: 'https://media.api-sports.io/football/players/626.png' },
      { id: 19209, name: 'F. Tomori', position: 'Defender', photo: 'https://media.api-sports.io/football/players/19209.png' },
      { id: 19959, name: 'B. White', position: 'Defender', photo: 'https://media.api-sports.io/football/players/19959.png' },
      { id: 138908, name: 'E. Anderson', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/138908.png' },
      { id: 129718, name: 'J. Bellingham', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/129718.png' },
      { id: 19586, name: 'E. Eze', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/19586.png' },
      { id: 631, name: 'P. Foden', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/631.png' },
      { id: 895, name: 'J. Garner', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/895.png' },
      { id: 18746, name: 'M. Gibbs-White', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/18746.png' },
      { id: 292, name: 'J. Henderson', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/292.png' },
      { id: 2292, name: 'R. Loftus-Cheek', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/2292.png' },
      { id: 284322, name: 'K. Mainoo', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/284322.png' },
      { id: 307123, name: "N. O'Reilly", position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/307123.png' },
      { id: 152982, name: 'C. Palmer', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/152982.png' },
      { id: 2937, name: 'D. Rice', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/2937.png' },
      { id: 19170, name: 'M. Rogers', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/19170.png' },
      { id: 304853, name: 'A. Scott', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/304853.png' },
      { id: 288102, name: 'A. Wharton', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/288102.png' },
      { id: 18778, name: 'H. Barnes', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/18778.png' },
      { id: 19428, name: 'J. Bowen', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/19428.png' },
      { id: 18766, name: 'D. Calvert-Lewin', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/18766.png' },
      { id: 138787, name: 'A. Gordon', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/138787.png' },
      { id: 184, name: 'H. Kane', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/184.png' },
      { id: 136723, name: 'N. Madueke', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/136723.png' },
      { id: 909, name: 'M. Rashford', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/909.png' },
      { id: 1460, name: 'B. Saka', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/1460.png' },
      { id: 18883, name: 'D. Solanke', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/18883.png' },
      { id: 19366, name: 'O. Watkins', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/19366.png' },
    ],
  },
  {
    teamCode: 'ARG',
    players: [
      { id: 22157, name: 'W. Benítez', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/22157.png' },
      { id: 6364, name: 'F. Cambeses', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/6364.png' },
      { id: 19599, name: 'E. Martínez', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/19599.png' },
      { id: 2465, name: 'J. Musso', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/2465.png' },
      { id: 47296, name: 'G. Rulli', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/47296.png' },
      { id: 620791, name: 'D. Talavera', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/620791.png' },
      { id: 1493, name: 'M. Acuña', position: 'Defender', photo: 'https://media.api-sports.io/football/players/1493.png' },
      { id: 6, name: 'L. Balerdi', position: 'Defender', photo: 'https://media.api-sports.io/football/players/6.png' },
      { id: 166, name: 'J. Foyth', position: 'Defender', photo: 'https://media.api-sports.io/football/players/166.png' },
      { id: 306706, name: 'A. Giay', position: 'Defender', photo: 'https://media.api-sports.io/football/players/306706.png' },
      { id: 5967, name: 'K. Mac Allister', position: 'Defender', photo: 'https://media.api-sports.io/football/players/5967.png' },
      { id: 6000, name: 'L. Martínez', position: 'Defender', photo: 'https://media.api-sports.io/football/players/6000.png' },
      { id: 6503, name: 'N. Molina', position: 'Defender', photo: 'https://media.api-sports.io/football/players/6503.png' },
      { id: 2468, name: 'G. Montiel', position: 'Defender', photo: 'https://media.api-sports.io/football/players/2468.png' },
      { id: 624, name: 'N. Otamendi', position: 'Defender', photo: 'https://media.api-sports.io/football/players/624.png' },
      { id: 6608, name: 'G. Rojas', position: 'Defender', photo: 'https://media.api-sports.io/football/players/6608.png' },
      { id: 30776, name: 'C. Romero', position: 'Defender', photo: 'https://media.api-sports.io/football/players/30776.png' },
      { id: 6610, name: 'M. Senesi', position: 'Defender', photo: 'https://media.api-sports.io/football/players/6610.png' },
      { id: 529, name: 'N. Tagliafico', position: 'Defender', photo: 'https://media.api-sports.io/football/players/529.png' },
      { id: 319572, name: 'V. Barco', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/319572.png' },
      { id: 19071, name: 'E. Buendía', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/19071.png' },
      { id: 5996, name: 'E. Fernández', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/5996.png' },
      { id: 1578, name: 'G. Lo Celso', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/1578.png' },
      { id: 6716, name: 'A. Mac Allister', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/6716.png' },
      { id: 6347, name: 'A. Moreno', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/6347.png' },
      { id: 6002, name: 'E. Palacios', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/6002.png' },
      { id: 271, name: 'L. Paredes', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/271.png' },
      { id: 350037, name: 'N. Paz', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/350037.png' },
      { id: 288699, name: 'M. Perrone', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/288699.png' },
      { id: 2472, name: 'R. De Paul', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/2472.png' },
      { id: 6067, name: 'T. Almada', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/6067.png' },
      { id: 6009, name: 'J. Álvarez', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/6009.png' },
      { id: 26315, name: 'N. González', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/26315.png' },
      { id: 295513, name: 'J. López', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/295513.png' },
      { id: 217, name: 'Lautaro Martínez', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/217.png' },
      { id: 449249, name: 'Franco Mastantuono', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/449249.png' },
      { id: 154, name: 'L. Messi', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/154.png' },
      { id: 390742, name: 'J. Panichelli', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/390742.png' },
      { id: 362755, name: 'G. Prestianni', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/362755.png' },
      { id: 323935, name: 'G. Simeone', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/323935.png' },
    ],
  },
  {
    teamCode: 'GER',
    players: [
      { id: 702, name: 'O. Baumann', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/702.png' },
      { id: 25903, name: 'F. Dahmen', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/25903.png' },
      { id: 399, name: 'A. Nübel', position: 'Goalkeeper', photo: 'https://media.api-sports.io/football/players/399.png' },
      { id: 25368, name: 'W. Anton', position: 'Defender', photo: 'https://media.api-sports.io/football/players/25368.png' },
      { id: 280074, name: 'N. Brown', position: 'Defender', photo: 'https://media.api-sports.io/football/players/280074.png' },
      { id: 26238, name: 'R. Koch', position: 'Defender', photo: 'https://media.api-sports.io/football/players/26238.png' },
      { id: 25158, name: 'D. Raum', position: 'Defender', photo: 'https://media.api-sports.io/football/players/25158.png' },
      { id: 2285, name: 'A. Rüdiger', position: 'Defender', photo: 'https://media.api-sports.io/football/players/2285.png' },
      { id: 26243, name: 'N. Schlotterbeck', position: 'Defender', photo: 'https://media.api-sports.io/football/players/26243.png' },
      { id: 972, name: 'J. Tah', position: 'Defender', photo: 'https://media.api-sports.io/football/players/972.png' },
      { id: 163189, name: 'M. Thiaw', position: 'Defender', photo: 'https://media.api-sports.io/football/players/163189.png' },
      { id: 24868, name: 'J. Vagnoman', position: 'Defender', photo: 'https://media.api-sports.io/football/players/24868.png' },
      { id: 714, name: 'N. Amiri', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/714.png' },
      { id: 24903, name: 'R. Andrich', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/24903.png' },
      { id: 25917, name: 'R. Baku', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/25917.png' },
      { id: 432310, name: 'S. El Mala', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/432310.png' },
      { id: 511, name: 'L. Goretzka', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/511.png' },
      { id: 18970, name: 'P. Groß', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/18970.png' },
      { id: 494131, name: 'L. Karl', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/494131.png' },
      { id: 502, name: 'J. Kimmich', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/502.png' },
      { id: 637, name: 'F. Nmecha', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/637.png' },
      { id: 380978, name: 'A. Ouédraogo', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/380978.png' },
      { id: 328033, name: 'A. Pavlović', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/328033.png' },
      { id: 178077, name: 'K. Schade', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/178077.png' },
      { id: 177665, name: 'A. Stach', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/177665.png' },
      { id: 137210, name: 'A. Stiller', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/137210.png' },
      { id: 203224, name: 'F. Wirtz', position: 'Midfielder', photo: 'https://media.api-sports.io/football/players/203224.png' },
      { id: 7334, name: 'K. Adeyemi', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/7334.png' },
      { id: 158644, name: 'M. Beier', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/158644.png' },
      { id: 25926, name: 'J. Burkardt', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/25926.png' },
      { id: 24798, name: 'C. Führich', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/24798.png' },
      { id: 510, name: 'S. Gnabry', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/510.png' },
      { id: 978, name: 'K. Havertz', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/978.png' },
      { id: 128533, name: 'J. Leweling', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/128533.png' },
      { id: 644, name: 'L. Sané', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/644.png' },
      { id: 26475, name: 'D. Undav', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/26475.png' },
      { id: 158054, name: 'N. Woltemade', position: 'Attacker', photo: 'https://media.api-sports.io/football/players/158054.png' },
    ],
  },
];

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    @InjectRepository(MatchStat)
    private matchStatsRepo: Repository<MatchStat>,
    @InjectRepository(Team)
    private teamsRepository: Repository<Team>,
    @InjectRepository(Tier)
    private tiersRepository: Repository<Tier>,
  ) {}

  async findAll(filters: FilterPlayersDto): Promise<Player[]> {
    const qb = this.playersRepository
      .createQueryBuilder('player')
      .leftJoinAndSelect('player.team', 'team')
      .leftJoinAndSelect('player.tier', 'tier')
      .orderBy('tier.coinPrice', 'DESC')
      .addOrderBy('player.name', 'ASC');

    // BUG-L05: exclude eliminated team players from marketplace by default
    qb.andWhere('team.eliminated = :eliminated', { eliminated: false });

    if (filters.position) {
      qb.andWhere('player.position = :position', { position: filters.position });
    }
    if (filters.tierId) {
      qb.andWhere('player.tierId = :tierId', { tierId: filters.tierId });
    }
    if (filters.teamId) {
      qb.andWhere('player.teamId = :teamId', { teamId: filters.teamId });
    }
    if (filters.search) {
      // BUG-021: escape LIKE wildcards to prevent injection/unexpected results
      const escaped = filters.search.replace(/[%_\\]/g, '\\$&');
      qb.andWhere('LOWER(player.name) LIKE LOWER(:search) ESCAPE \'\\\'', {
        search: `%${escaped}%`,
      });
    }

    return qb.getMany();
  }

  async findById(id: number): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: { id },
      relations: ['team', 'tier'],
    });
    if (!player) {
      throw new NotFoundException(`ფეხბურთელი #${id} ვერ მოიძებნა`);
    }
    return player;
  }

  async create(dto: CreatePlayerDto): Promise<Player> {
    const player = this.playersRepository.create(dto);
    return this.playersRepository.save(player);
  }

  async update(id: number, dto: UpdatePlayerDto): Promise<Player> {
    const player = await this.findById(id);
    Object.assign(player, dto);
    return this.playersRepository.save(player);
  }

  async findByTeam(teamId: number): Promise<Player[]> {
    return this.playersRepository.find({
      where: { teamId },
      relations: ['tier'],
      order: { position: 'ASC', name: 'ASC' },
    });
  }

  async getPlayerStats(playerId: number): Promise<MatchStat[]> {
    await this.findById(playerId);
    return this.matchStatsRepo.find({
      where: { playerId },
      relations: ['match', 'match.homeTeam', 'match.awayTeam', 'match.tournament'],
      order: { createdAt: 'DESC' },
    });
  }

  async seedTop5Teams(): Promise<{ created: number; skipped: number }> {
    const tiers = await this.tiersRepository.find();
    const tierMap = new Map(tiers.map((t) => [t.name, t]));

    const superstar = tierMap.get('Superstar');
    const strong = tierMap.get('Strong');
    const average = tierMap.get('Average');
    const backup = tierMap.get('Backup');
    const reserve = tierMap.get('Reserve');

    if (!superstar || !strong || !average || !backup || !reserve) {
      throw new Error('Tiers not seeded. Run POST /admin/tiers/seed first.');
    }

    const resolveTier = (apiId: number): Tier => {
      if (SUPERSTAR_IDS.has(apiId)) return superstar;
      if (STRONG_IDS.has(apiId)) return strong;
      if (RESERVE_IDS.has(apiId)) return reserve;
      return average;
    };

    let created = 0;
    let skipped = 0;

    for (const teamData of TOP5_DATA) {
      const team = await this.teamsRepository.findOne({ where: { code: teamData.teamCode } });
      if (!team) {
        skipped += teamData.players.length;
        continue;
      }

      for (const raw of teamData.players) {
        const existing = await this.playersRepository.findOne({
          where: { apiFootballId: raw.id },
        });
        if (existing) {
          skipped++;
          continue;
        }

        const tier = resolveTier(raw.id);
        await this.playersRepository.save(
          this.playersRepository.create({
            name: raw.name,
            position: POS_MAP[raw.position],
            photo: raw.photo,
            apiFootballId: raw.id,
            teamId: team.id,
            tierId: tier.id,
          }),
        );
        created++;
      }
    }

    return { created, skipped };
  }
}
