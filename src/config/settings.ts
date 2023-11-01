import SampleNft from './abi/SampleNft.json';

type ChainSettings = {
  [key: string]: string;
};

type Settings = {
  rpc: {
    [key: string]: string;
  };
  addresses: {
    [key: string]: ChainSettings;
  };
  abis: {
    [key: string]: typeof SampleNft;
  };
};

const settings: Settings = {
  rpc: {
    polygon: 'https://polygon-rpc.com',
    polygonMumbai: 'https://rpc.ankr.com/polygon_mumbai',
  },
  addresses: {
    polygon: {
      SampleNft: '',
    },
    polygonMumbai: {
      SampleNft: '0x5AF46225F6990d1067832f9E1F8e7118248F6C11',
    },
  },
  abis: {
    SampleNft,
  },
};

export default settings;
